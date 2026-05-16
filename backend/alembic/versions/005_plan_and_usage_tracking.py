"""add plan_type and usage tracking to companies

Revision ID: 005
Revises: 004
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("plan_type", sa.String(), nullable=False, server_default="testing"))
    op.add_column("companies", sa.Column("docs_uploaded_this_month", sa.Integer(), nullable=False, server_default="0"))
    op.add_column(
        "companies",
        sa.Column("monthly_reset_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_check_constraint(
        "ck_companies_plan_type",
        "companies",
        "plan_type IN ('testing', 'starter', 'growth', 'enterprise')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_companies_plan_type", "companies", type_="check")
    op.drop_column("companies", "monthly_reset_at")
    op.drop_column("companies", "docs_uploaded_this_month")
    op.drop_column("companies", "plan_type")
