"""add ksef upo polling fields

Revision ID: 002
Revises: 001
"""
from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE ksef_submissions
            ADD COLUMN ksef_session_ref  TEXT,
            ADD COLUMN ksef_number       TEXT,
            ADD COLUMN upo_url           TEXT,
            ADD COLUMN polling_attempts  INT NOT NULL DEFAULT 0;
    """)
    op.execute("""
        CREATE INDEX idx_ksef_submissions_polling
            ON ksef_submissions (status, polling_attempts)
            WHERE status = 'submitted';
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_ksef_submissions_polling;")
    op.execute("""
        ALTER TABLE ksef_submissions
            DROP COLUMN IF EXISTS ksef_session_ref,
            DROP COLUMN IF EXISTS ksef_number,
            DROP COLUMN IF EXISTS upo_url,
            DROP COLUMN IF EXISTS polling_attempts;
    """)
