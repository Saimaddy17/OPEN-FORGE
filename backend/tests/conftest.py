import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault(
    "SECRET_KEY",
    "test-only-secret-key-that-is-not-used-outside-tests",
)

from app.database.connection import Base, get_db
from app.main import app


@pytest.fixture
def db_session_factory():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    test_session_factory = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )
    try:
        yield test_session_factory
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def client(db_session_factory):
    def override_get_db():
        with db_session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def seeded_category(db_session_factory):
    from app.models.category import Category

    with db_session_factory() as db:
        category = Category(name="Developer Tools", slug="developer-tools")
        db.add(category)
        db.commit()
        db.refresh(category)
        return category.id
