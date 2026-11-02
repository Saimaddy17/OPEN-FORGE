
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (
        CheckConstraint(
            "project_type IN ('source', 'installer')",
            name="ck_submissions_project_type",
        ),
    )

    # Primary key
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # Developer who submitted the application
    developer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Linked application after approval
    application_id: Mapped[int | None] = mapped_column(
        ForeignKey("applications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Application information submitted for review
    proposed_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    short_description: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
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

    # Admin review information
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
        index=True,
    )

    admin_comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
