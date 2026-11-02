from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.core.dependencies import get_current_admin, get_current_user
from app.main import app
from app.models.user import User
from app.services.category_seed import seed_initial_categories


def register_and_login(client: TestClient, email: str) -> tuple[int, str]:
    registration = client.post(
        "/auth/register",
        json={
            "full_name": "OpenForge Developer",
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
    return user_id, login.json()["access_token"]


def test_existing_auth_registration_login_and_me(client: TestClient):
    registration = client.post(
        "/auth/register",
        json={
            "full_name": "OpenForge Developer",
            "email": "auth@example.com",
            "password": "secure-test-password",
            "role": "admin",
        },
    )
    assert registration.status_code == 201
    user_id = registration.json()["id"]
    assert registration.json()["role"] == "developer"

    login = client.post(
        "/auth/login",
        json={"email": "auth@example.com", "password": "secure-test-password"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    profile = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile.status_code == 200
    assert profile.json()["id"] == user_id
    assert profile.json()["role"] == "developer"


def test_categories_api_reads_active_categories_and_seed_is_idempotent(
    client: TestClient,
    db_session_factory,
):
    from app.models.category import Category

    with db_session_factory() as db:
        assert seed_initial_categories(db) == 6
        assert seed_initial_categories(db) == 0
        db.add(Category(name="Hidden", slug="hidden", is_active=False))
        db.commit()

    response = client.get("/api/categories")
    assert response.status_code == 200
    categories = response.json()
    assert len(categories) == 6
    assert all(category["is_active"] for category in categories)
    assert categories == sorted(categories, key=lambda category: category["name"])


def test_developer_submissions_are_pending_and_private(
    client: TestClient,
    seeded_category: int,
):
    developer_id, developer_token = register_and_login(
        client,
        "first-developer@example.com",
    )
    other_id, other_token = register_and_login(
        client,
        "second-developer@example.com",
    )
    headers = {"Authorization": f"Bearer {developer_token}"}
    payload = {
        "proposed_name": "Sample App",
        "short_description": "A useful open-source application.",
        "description": "A longer description for the sample application.",
        "category_id": seeded_category,
        "repository_url": "https://github.com/example/sample",
        "official_website": "https://example.test",
        "download_url": "https://downloads.example.test/sample",
        "license": "MIT",
        "version": "1.0.0",
    }

    created = client.post("/api/submissions", json=payload, headers=headers)
    assert created.status_code == 201
    assert created.json()["developer_id"] == developer_id
    assert created.json()["status"] == "pending"

    own_submissions = client.get("/api/submissions/my", headers=headers)
    assert own_submissions.status_code == 200
    assert [item["id"] for item in own_submissions.json()] == [
        created.json()["id"]
    ]

    other_submissions = client.get(
        "/api/submissions/my",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert other_id != developer_id
    assert other_submissions.status_code == 200
    assert other_submissions.json() == []


def test_submission_requires_auth_and_valid_category(
    client: TestClient,
):
    unauthenticated = client.get("/api/submissions/my")
    assert unauthenticated.status_code == 401

    _, token = register_and_login(client, "invalid-submit@example.com")
    invalid_url = client.post(
        "/api/submissions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "proposed_name": "Invalid URL App",
            "short_description": "A useful application.",
            "description": "A valid application description.",
            "category_id": 1,
            "repository_url": "not-a-url",
            "license": "MIT",
        },
    )
    assert invalid_url.status_code == 422

    response = client.post(
        "/api/submissions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "proposed_name": "Invalid Category App",
            "short_description": "A useful application.",
            "description": "A valid application description.",
            "category_id": 9999,
            "repository_url": "https://github.com/example/app",
            "license": "MIT",
        },
    )
    assert response.status_code == 422


def test_non_admin_database_user_is_denied_admin_dependency():
    admin_test_app = FastAPI()

    @admin_test_app.get("/admin-only")
    def admin_only(current_user: User = Depends(get_current_admin)):
        return {"id": current_user.id}

    developer = User(
        id=1,
        full_name="Developer",
        email="developer@example.test",
        hashed_password="unused",
        role="developer",
        is_active=True,
    )
    admin_test_app.dependency_overrides[get_current_user] = lambda: developer

    with TestClient(admin_test_app) as client:
        response = client.get("/admin-only")

    assert response.status_code == 403


def test_new_endpoints_are_in_openapi():
    paths = app.openapi()["paths"]
    assert "/api/categories" in paths
    assert "/api/submissions" in paths
    assert "/api/submissions/my" in paths
