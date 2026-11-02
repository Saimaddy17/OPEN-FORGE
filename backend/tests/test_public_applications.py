from fastapi.testclient import TestClient

from app.models.application import Application
from app.models.category import Category
from app.models.user import User


def add_marketplace_data(db_session_factory) -> dict[str, int]:
    with db_session_factory() as db:
        developer = User(
            full_name="Marketplace Developer",
            email="marketplace@example.com",
            hashed_password="unused-test-hash",
            role="developer",
            is_active=True,
        )
        first_category = Category(name="Developer Tools", slug="developer-tools")
        second_category = Category(name="Design", slug="design")
        db.add_all([developer, first_category, second_category])
        db.flush()

        published = Application(
            name="Forge Search",
            slug="forge-search",
            short_description="A source-code search utility.",
            description="Find code and documentation across your projects.",
            developer_id=developer.id,
            category_id=first_category.id,
            repository_url="https://github.com/example/forge-search",
            official_website="https://forge-search.example.com",
            download_url="https://downloads.example.com/forge-search",
            license="MIT",
            version="1.0.0",
            logo_url="https://example.com/forge-search.png",
            is_published=True,
        )
        unpublished = Application(
            name="Private Search",
            slug="private-search",
            short_description="An unpublished search tool.",
            description="This listing is not public.",
            developer_id=developer.id,
            category_id=first_category.id,
            repository_url="https://github.com/example/private-search",
            license="Apache-2.0",
            is_published=False,
        )
        design_app = Application(
            name="Canvas Studio",
            slug="canvas-studio",
            short_description="A design application.",
            description="Create and edit collaborative designs.",
            developer_id=developer.id,
            category_id=second_category.id,
            repository_url="https://github.com/example/canvas-studio",
            license="MPL-2.0",
            is_published=True,
        )
        db.add_all([published, unpublished, design_app])
        db.commit()
        return {
            "published_id": published.id,
            "unpublished_id": unpublished.id,
            "design_id": design_app.id,
            "developer_tools_id": first_category.id,
            "design_category_id": second_category.id,
        }


def test_marketplace_returns_published_application_fields(
    client: TestClient,
    db_session_factory,
):
    data = add_marketplace_data(db_session_factory)

    response = client.get("/api/applications")

    assert response.status_code == 200
    applications = response.json()
    assert [app["id"] for app in applications] == [
        data["design_id"],
        data["published_id"],
    ]
    assert all(app["id"] != data["unpublished_id"] for app in applications)

    published = next(app for app in applications if app["id"] == data["published_id"])
    assert published == {
        "id": data["published_id"],
        "name": "Forge Search",
        "slug": "forge-search",
        "short_description": "A source-code search utility.",
        "description": "Find code and documentation across your projects.",
        "category_id": data["developer_tools_id"],
        "category_name": "Developer Tools",
        "repository_url": "https://github.com/example/forge-search",
        "official_website": "https://forge-search.example.com",
        "download_url": "https://downloads.example.com/forge-search",
        "license": "MIT",
        "project_type": "source",
        "version": "1.0.0",
        "logo_url": "https://example.com/forge-search.png",
        "developer_id": 1,
        "created_at": published["created_at"],
    }


def test_marketplace_search_matches_name_or_description(
    client: TestClient,
    db_session_factory,
):
    data = add_marketplace_data(db_session_factory)

    name_search = client.get("/api/applications", params={"search": "FORGE"})
    description_search = client.get(
        "/api/applications",
        params={"search": "collaborative designs"},
    )

    assert name_search.status_code == 200
    assert [app["id"] for app in name_search.json()] == [data["published_id"]]
    assert description_search.status_code == 200
    assert [app["id"] for app in description_search.json()] == [data["design_id"]]


def test_marketplace_filters_by_category(
    client: TestClient,
    db_session_factory,
):
    data = add_marketplace_data(db_session_factory)

    response = client.get(
        "/api/applications",
        params={"category_id": data["design_category_id"]},
    )

    assert response.status_code == 200
    assert [app["id"] for app in response.json()] == [data["design_id"]]


def test_empty_marketplace_returns_empty_list(client: TestClient):
    response = client.get("/api/applications")

    assert response.status_code == 200
    assert response.json() == []
