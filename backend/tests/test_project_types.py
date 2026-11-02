from fastapi.testclient import TestClient

from app.models.application import Application
from app.models.submission import Submission
from app.models.user import User


def register_developer(client: TestClient) -> str:
    email = "project-types@example.com"
    registration = client.post(
        "/auth/register",
        json={
            "full_name": "Project Type Developer",
            "email": email,
            "password": "secure-test-password",
        },
    )
    assert registration.status_code == 201
    login = client.post(
        "/auth/login",
        json={"email": email, "password": "secure-test-password"},
    )
    assert login.status_code == 200
    return login.json()["access_token"]


def publish_submission(
    client: TestClient,
    token: str,
    category_id: int,
    payload: dict,
):
    return client.post(
        "/api/submissions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "proposed_name": "Project Type Test",
            "short_description": "Project type validation test.",
            "category_id": category_id,
            **payload,
        },
    )


def test_source_project_requires_repository(
    client: TestClient,
    seeded_category: int,
):
    token = register_developer(client)

    response = publish_submission(
        client,
        token,
        seeded_category,
        {"project_type": "source"},
    )

    assert response.status_code == 422


def test_installer_requires_download_url(
    client: TestClient,
    seeded_category: int,
):
    token = register_developer(client)

    response = publish_submission(
        client,
        token,
        seeded_category,
        {"project_type": "installer"},
    )

    assert response.status_code == 422


def test_installer_submission_can_omit_repository_and_license_and_stays_pending(
    client: TestClient,
    db_session_factory,
    seeded_category: int,
):
    token = register_developer(client)

    response = publish_submission(
        client,
        token,
        seeded_category,
        {
            "project_type": "installer",
            "download_url": "https://downloads.example.com/app.exe",
            "description": "",
            "license": "",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["project_type"] == "installer"
    assert payload["repository_url"] is None
    assert payload["download_url"] == "https://downloads.example.com/app.exe"
    assert payload["license"] is None
    assert payload["description"] == "Project type validation test."
    assert payload["status"] == "pending"
    assert payload["application_id"] is None

    with db_session_factory() as db:
        submission = db.query(Submission).filter_by(id=payload["id"]).one()
        assert submission.project_type == "installer"
        assert submission.repository_url is None
        assert submission.license is None
        assert db.query(Application).count() == 0


def test_admin_approval_preserves_installer_type_and_optional_fields(
    client: TestClient,
    db_session_factory,
    seeded_category: int,
):
    developer_token = register_developer(client)
    submission_response = publish_submission(
        client,
        developer_token,
        seeded_category,
        {
            "project_type": "installer",
            "download_url": "https://downloads.example.com/app.exe",
        },
    )
    assert submission_response.status_code == 201
    submission_id = submission_response.json()["id"]

    admin_registration = client.post(
        "/auth/register",
        json={
            "full_name": "Project Type Admin",
            "email": "project-type-admin@example.com",
            "password": "secure-test-password",
        },
    )
    assert admin_registration.status_code == 201
    admin_id = admin_registration.json()["id"]
    admin_login = client.post(
        "/auth/login",
        json={
            "email": "project-type-admin@example.com",
            "password": "secure-test-password",
        },
    )
    assert admin_login.status_code == 200
    with db_session_factory() as db:
        admin = db.query(User).filter_by(id=admin_id).one()
        admin.role = "admin"
        db.commit()

    approval = client.post(
        f"/api/admin/submissions/{submission_id}/approve",
        headers={"Authorization": f"Bearer {admin_login.json()['access_token']}"},
    )

    assert approval.status_code == 200
    with db_session_factory() as db:
        submission = db.query(Submission).filter_by(id=submission_id).one()
        application = db.query(Application).filter_by(
            id=submission.application_id
        ).one()
        assert submission.status == "approved"
        assert application.project_type == "installer"
        assert application.repository_url is None
        assert application.download_url == "https://downloads.example.com/app.exe"
        assert application.license is None
        assert application.is_published is True


def test_invalid_project_type_is_rejected(
    client: TestClient,
    seeded_category: int,
):
    token = register_developer(client)

    response = publish_submission(
        client,
        token,
        seeded_category,
        {
            "project_type": "archive",
            "repository_url": "https://github.com/example/app",
        },
    )

    assert response.status_code == 422
