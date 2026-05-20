"""add gdpr consent columns to profiles

Revision ID: 006
Revises: 005
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("tos_accepted_at", sa.TIMESTAMP(timezone=True), nullable=True))
    op.add_column("profiles", sa.Column("tos_version", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "tos_version")
    op.drop_column("profiles", "tos_accepted_at")
