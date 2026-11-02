
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        CheckConstraint(
            "project_type IN ('source', 'installer')",
            name="ck_applications_project_type",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )

    slug: Mapped[str] = mapped_column(
        String(180),
        unique=True,
        nullable=False,
        index=True,
    )

    short_description: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    developer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    repository_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    official_website: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    download_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    license: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    project_type: Mapped[str] = mapped_column(
        String(20),
        default="source",
        server_default="source",
        nullable=False,
    )

    version: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    logo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    is_published: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
