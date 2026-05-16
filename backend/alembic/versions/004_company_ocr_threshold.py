"""add ocr_confidence_threshold to companies

Revision ID: 004
Revises: 003
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column("ocr_confidence_threshold", sa.SmallInteger(), nullable=False, server_default="80"),
    )
    op.create_check_constraint(
        "ck_companies_ocr_threshold",
        "companies",
        "ocr_confidence_threshold BETWEEN 0 AND 100",
    )


def downgrade() -> None:
    op.drop_constraint("ck_companies_ocr_threshold", "companies", type_="check")
    op.drop_column("companies", "ocr_confidence_threshold")
