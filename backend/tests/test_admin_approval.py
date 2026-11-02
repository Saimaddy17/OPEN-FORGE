from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.models.application import Application
from app.models.submission import Submission
from app.models.user import User
from app.main import app


def create_account(
    client: TestClient,
    db_session_factory,
    email: str,
    role: str = "developer",
) -> tuple[int, str]:
    registration = client.post(
        "/auth/register",
        json={
            "full_name": "Review Test User",
            "email": email,
            "password": "secure-test-password",
        },
    )
    assert registration.status_code == 201
    user_id = registration.json()["id"]

    login = client.post(
        "/auth/login",
        json={"email": email, "password": "secure-test-password"},
    )
    assert login.status_code == 200

    if role != "developer":
        with db_session_factory() as db:
            user = db.query(User).filter(User.id == user_id).one()
            user.role = role
            db.commit()

    return user_id, login.json()["access_token"]


def create_submission(
    client: TestClient,
    token: str,
    category_id: int,
    proposed_name: str = "Reviewable Sample",
) -> dict:
    response = client.post(
        "/api/submissions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "proposed_name": proposed_name,
            "short_description": "A useful open-source application.",
            "description": "A longer description for the reviewable application.",
            "category_id": category_id,
            "repository_url": "https://github.com/example/reviewable",
            "official_website": "https://example.com",
            "download_url": "https://downloads.example.com/reviewable",
            "license": "MIT",
            "version": "1.2.3",
            "logo_url": "https://example.com/logo.png",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_admin_routes_require_authentication(client: TestClient):
    pending = client.get("/api/admin/submissions/pending")
    approve = client.post("/api/admin/submissions/1/approve")
    reject = client.post(
        "/api/admin/submissions/1/reject",
        json={"admin_comment": "Not suitable."},
    )

    assert pending.status_code == 401
    assert approve.status_code == 401
    assert reject.status_code == 401


def test_developer_cannot_list_or_review_submissions(
    client: TestClient,
    db_session_factory,
    seeded_category: int,
):
    _, developer_token = create_account(
        client,
        db_session_factory,
        "review-developer@example.com",
    )
    submission = create_submission(client, developer_token, seeded_category)
    headers = {"Authorization": f"Bearer {developer_token}"}

    pending = client.get("/api/admin/submissions/pending", headers=headers)
    approve = client.post(
        f"/api/admin/submissions/{submission['id']}/approve",
        headers=headers,
    )
    reject = client.post(
        f"/api/admin/submissions/{submission['id']}/reject",
        headers=headers,
        json={"admin_comment": "Not suitable."},
    )

    assert pending.status_code == 403
    assert approve.status_code == 403
    assert reject.status_code == 403
    with db_session_factory() as db:
        stored = db.query(Submission).filter_by(id=submission["id"]).one()
        assert stored.status == "pending"
        assert stored.application_id is None
        assert db.query(Application).count() == 0


def test_admin_lists_only_pending_submissions(
    client: TestClient,
    db_session_factory,
    seeded_category: int,
):
    _, developer_token = create_account(
        client,
        db_session_factory,
        "pending-list-developer@example.com",
    )
    _, admin_token = create_account(
        client,
        db_session_factory,
        "pending-list-admin@example.com",
        role="admin",
    )
    pending = create_submission(client, developer_token, seeded_category)
    rejected = create_submission(
        client,
        developer_token,
        seeded_category,
        proposed_name="Rejected Sample",
    )
    headers = {"Authorization": f"Bearer {admin_token}"}
    rejection = client.post(
        f"/api/admin/submissions/{rejected['id']}/reject",
        headers=headers,
        json={"admin_comment": "Needs more documentation."},
    )
    assert rejection.status_code == 200

    response = client.get("/api/admin/submissions/pending", headers=headers)

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [pending["id"]]


def test_admin_approval_publishes_application_and_links_atomically(
    client: TestClient,
    db_session_factory,
    seeded_category: int,
):
    developer_id, developer_token = create_account(
        client,
        db_session_factory,
        "approval-developer@example.com",
    )
    admin_id, admin_token = create_account(
        client,
        db_session_factory,
        "approval-admin@example.com",
        role="admin",
    )
    submission = create_submission(client, developer_token, seeded_category)

    response = client.post(
        f"/api/admin/submissions/{submission['id']}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert response.json()["reviewed_by"] == admin_id
    assert response.json()["reviewed_at"] is not None
    assert response.json()["application_id"] is not None

    with db_session_factory() as db:
        stored_submission = (
            db.query(Submission).filter_by(id=submission["id"]).one()
        )
        application = (
            db.query(Application)
            .filter_by(id=stored_submission.application_id)
            .one()
        )
        assert stored_submission.status == "approved"
        assert stored_submission.reviewed_by == admin_id
        assert isinstance(stored_submission.reviewed_at, datetime)
        assert application.name == submission["proposed_name"]
        assert application.developer_id == developer_id
        assert application.category_id == seeded_category
        assert application.repository_url == submission["repository_url"]
        assert application.official_website == submission["official_website"]
        assert application.download_url == submission["download_url"]
        assert application.license == submission["license"]
        assert application.version == submission["version"]
        assert application.logo_url == submission["logo_url"]
        assert application.is_published is True
        assert application.slug.endswith(f"-{submission['id']}")
        assert db.query(Application).count() == 1


def test_admin_rejection_requires_comment_and_persists_review(
    client: TestClient,
    db_session_factory,
    seeded_category: int,
):
    _, developer_token = create_account(
        client,
        db_session_factory,
        "rejection-developer@example.com",
    )
    admin_id, admin_token = create_account(
        client,
        db_session_factory,
        "rejection-admin@example.com",
        role="admin",
    )
    submission = create_submission(client, developer_token, seeded_category)
    headers = {"Authorization": f"Bearer {admin_token}"}

    missing_comment = client.post(
        f"/api/admin/submissions/{submission['id']}/reject",
        headers=headers,
        json={},
    )
    blank_comment = client.post(
        f"/api/admin/submissions/{submission['id']}/reject",
        headers=headers,
        json={"admin_comment": "   "},
    )
    assert missing_comment.status_code == 422
    assert blank_comment.status_code == 422

    response = client.post(
        f"/api/admin/submissions/{submission['id']}/reject",
        headers=headers,
        json={"admin_comment": "  Please add a security policy.  "},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    assert response.json()["admin_comment"] == "Please add a security policy."
    assert response.json()["reviewed_by"] == admin_id
    assert response.json()["reviewed_at"] is not None
    assert response.json()["application_id"] is None
    with db_session_factory() as db:
        stored = db.query(Submission).filter_by(id=submission["id"]).one()
        assert stored.status == "rejected"
        assert stored.admin_comment == "Please add a security policy."
        assert stored.reviewed_by == admin_id
        assert stored.application_id is None
        assert db.query(Application).count() == 0


@pytest.mark.parametrize("action", ["approve", "reject"])
def test_missing_submission_returns_404_for_review_actions(
    client: TestClient,
    db_session_factory,
    action: str,
):
    _, admin_token = create_account(
        client,
        db_session_factory,
        f"missing-{action}-admin@example.com",
        role="admin",
    )
    response = client.post(
        f"/api/admin/submissions/999/{action}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"admin_comment": "Missing submission."} if action == "reject" else None,
    )
    assert response.status_code == 404


def test_review_actions_cannot_be_repeated_or_changed(
    client: TestClient,
    db_session_factory,
    seeded_category: int,
):
    _, developer_token = create_account(
        client,
        db_session_factory,
        "repeat-developer@example.com",
    )
    _, admin_token = create_account(
        client,
        db_session_factory,
        "repeat-admin@example.com",
        role="admin",
    )
    approved = create_submission(
        client,
        developer_token,
        seeded_category,
        proposed_name="Repeat Approval",
    )
    rejected = create_submission(
        client,
        developer_token,
        seeded_category,
        proposed_name="Repeat Rejection",
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    assert client.post(
        f"/api/admin/submissions/{approved['id']}/approve",
        headers=headers,
    ).status_code == 200
    assert client.post(
        f"/api/admin/submissions/{approved['id']}/approve",
        headers=headers,
    ).status_code == 409
    assert client.post(
        f"/api/admin/submissions/{approved['id']}/reject",
        headers=headers,
        json={"admin_comment": "Changing decision."},
    ).status_code == 409

    rejection = client.post(
        f"/api/admin/submissions/{rejected['id']}/reject",
        headers=headers,
        json={"admin_comment": "Rejected once."},
    )
    assert rejection.status_code == 200
    assert client.post(
        f"/api/admin/submissions/{rejected['id']}/reject",
        headers=headers,
        json={"admin_comment": "Rejected twice."},
    ).status_code == 409
    assert client.post(
        f"/api/admin/submissions/{rejected['id']}/approve",
        headers=headers,
    ).status_code == 409

    with db_session_factory() as db:
        stored_approved = db.query(Submission).filter_by(id=approved["id"]).one()
        stored_rejected = db.query(Submission).filter_by(id=rejected["id"]).one()
        assert stored_approved.status == "approved"
        assert stored_rejected.status == "rejected"
        assert stored_rejected.admin_comment == "Rejected once."
        assert db.query(Application).count() == 1


def test_admin_endpoints_are_in_openapi():
    paths = app.openapi()["paths"]
    assert "/api/admin/submissions/pending" in paths
    assert "/api/admin/submissions/{submission_id}/approve" in paths
    assert "/api/admin/submissions/{submission_id}/reject" in paths
