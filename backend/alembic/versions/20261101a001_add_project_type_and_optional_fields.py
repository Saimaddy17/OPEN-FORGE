"""Add project type and allow optional repository/license fields.

Revision ID: 20261101a001
Revises: 68e8e23257b0
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261101a001"
down_revision: Union[str, Sequence[str], None] = "68e8e23257b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("applications", "submissions"):
        op.add_column(
            table,
            sa.Column("project_type", sa.String(length=20), nullable=True),
        )
        op.execute(
            sa.text(
                f"UPDATE {table} SET project_type = 'source' "
                "WHERE project_type IS NULL"
            )
        )
        op.alter_column(
            table,
            "project_type",
            existing_type=sa.String(length=20),
            nullable=False,
            server_default="source",
        )
        op.create_check_constraint(
            f"ck_{table}_project_type",
            table,
            "project_type IN ('source', 'installer')",
        )
        op.alter_column(
            table,
            "repository_url",
            existing_type=sa.String(length=500),
            nullable=True,
        )
        op.alter_column(
            table,
            "license",
            existing_type=sa.String(length=100),
            nullable=True,
        )


def downgrade() -> None:
    connection = op.get_bind()
    for table in ("applications", "submissions"):
        null_values = connection.execute(
            sa.text(
                f"SELECT COUNT(*) FROM {table} "
                "WHERE repository_url IS NULL OR license IS NULL"
            )
        ).scalar_one()
        if null_values:
            raise RuntimeError(
                f"Cannot downgrade: {table} contains rows with a null "
                "repository_url or license. Restore those values first."
            )

    for table in ("applications", "submissions"):
        op.alter_column(
            table,
            "repository_url",
            existing_type=sa.String(length=500),
            nullable=False,
        )
        op.alter_column(
            table,
            "license",
            existing_type=sa.String(length=100),
            nullable=False,
        )
        op.drop_constraint(f"ck_{table}_project_type", table, type_="check")
        op.drop_column(table, "project_type")
