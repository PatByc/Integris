"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-09

"""
from typing import Sequence, Union

from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE companies (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT        NOT NULL,
        nip         TEXT        NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_companies_nip UNIQUE (nip)
    );
    """)

    # profiles mirrors auth.users; id must match the Supabase Auth user id.
    # A trigger or application logic must create a profile on user sign-up.
    op.execute("""
    CREATE TABLE profiles (
        id           UUID        PRIMARY KEY,
        email        TEXT        NOT NULL,
        display_name TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_profiles_email UNIQUE (email)
    );
    """)

    op.execute("""
    CREATE TABLE company_memberships (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id  UUID        NOT NULL REFERENCES companies(id)  ON DELETE CASCADE,
        user_id     UUID        NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
        role        TEXT        NOT NULL CHECK (role IN ('owner', 'operator', 'viewer')),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_company_memberships UNIQUE (company_id, user_id)
    );
    CREATE INDEX idx_company_memberships_company ON company_memberships(company_id);
    CREATE INDEX idx_company_memberships_user    ON company_memberships(user_id);
    """)

    op.execute("""
    CREATE TABLE documents (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id       UUID        NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
        uploaded_by      UUID        NOT NULL REFERENCES profiles(id)  ON DELETE RESTRICT,
        filename         TEXT        NOT NULL,
        storage_path     TEXT        NOT NULL,
        file_size_bytes  INTEGER,
        status           TEXT        NOT NULL DEFAULT 'uploaded'
            CHECK (status IN (
                'uploaded',
                'ocr_processing',   'ocr_failed',
                'extraction_processing', 'extraction_failed',
                'validation_failed', 'needs_review',
                'approved',
                'xml_generated',
                'submission_pending', 'submitted',
                'accepted', 'rejected',
                'cancelled'
            )),
        retry_count      INTEGER     NOT NULL DEFAULT 0,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_documents_company_id ON documents(company_id);
    CREATE INDEX idx_documents_status     ON documents(status);
    CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
    """)

    op.execute("""
    CREATE TABLE ocr_results (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id     UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        raw_text        TEXT,
        page_count      INTEGER,
        provider        TEXT        NOT NULL DEFAULT 'google_vision',
        attempt_number  INTEGER     NOT NULL DEFAULT 1,
        error_message   TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_ocr_results_document_id ON ocr_results(document_id);
    """)

    op.execute("""
    CREATE TABLE invoice_drafts (
        id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id       UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        company_id        UUID        NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
        seller_name       TEXT,
        seller_nip        TEXT,
        seller_address    TEXT,
        buyer_name        TEXT,
        buyer_nip         TEXT,
        buyer_address     TEXT,
        invoice_number    TEXT,
        issue_date        DATE,
        sale_date         DATE,
        payment_due_date  DATE,
        payment_method    TEXT,
        currency          TEXT        DEFAULT 'PLN',
        net_total         NUMERIC(12, 2),
        vat_total         NUMERIC(12, 2),
        gross_total       NUMERIC(12, 2),
        vat_summary       JSONB,
        confidence        NUMERIC(3, 2),
        flags             JSONB       DEFAULT '[]',
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_invoice_drafts_document_id ON invoice_drafts(document_id);
    CREATE INDEX idx_invoice_drafts_company_id  ON invoice_drafts(company_id);
    """)

    op.execute("""
    CREATE TABLE invoice_line_items (
        id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_draft_id UUID          NOT NULL REFERENCES invoice_drafts(id) ON DELETE CASCADE,
        description      TEXT,
        quantity         NUMERIC(12, 4),
        unit             TEXT,
        unit_price_net   NUMERIC(12, 4),
        vat_rate         NUMERIC(5, 2),
        net_amount       NUMERIC(12, 2),
        vat_amount       NUMERIC(12, 2),
        gross_amount     NUMERIC(12, 2),
        sort_order       INTEGER       NOT NULL DEFAULT 0,
        created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_invoice_line_items_draft_id ON invoice_line_items(invoice_draft_id);
    """)

    op.execute("""
    CREATE TABLE validation_errors (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id      UUID        NOT NULL REFERENCES documents(id)       ON DELETE CASCADE,
        invoice_draft_id UUID        REFERENCES invoice_drafts(id)           ON DELETE CASCADE,
        rule_name        TEXT        NOT NULL,
        field_path       TEXT,
        message          TEXT        NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_validation_errors_document_id ON validation_errors(document_id);
    """)

    op.execute("""
    CREATE TABLE review_actions (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id     UUID        NOT NULL REFERENCES profiles(id)  ON DELETE RESTRICT,
        action      TEXT        NOT NULL
            CHECK (action IN ('correction', 'approval', 'rejection', 'retry')),
        notes       TEXT,
        diff        JSONB,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_review_actions_document_id ON review_actions(document_id);
    """)

    op.execute("""
    CREATE TABLE xml_exports (
        id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id    UUID        NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
        xml_content    TEXT        NOT NULL,
        content_hash   TEXT        NOT NULL,
        schema_version TEXT        NOT NULL DEFAULT 'FA(3)',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_xml_exports_document_id ON xml_exports(document_id);
    """)

    op.execute("""
    CREATE TABLE ksef_submissions (
        id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id       UUID        NOT NULL REFERENCES documents(id)    ON DELETE RESTRICT,
        xml_export_id     UUID        NOT NULL REFERENCES xml_exports(id)  ON DELETE RESTRICT,
        ksef_reference_id TEXT,
        status            TEXT        NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'submitted', 'accepted', 'rejected')),
        request_payload   JSONB,
        response_payload  JSONB,
        error_details     JSONB,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_ksef_submissions_document_id ON ksef_submissions(document_id);
    """)

    op.execute("""
    CREATE TABLE audit_events (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID        REFERENCES documents(id)  ON DELETE SET NULL,
        company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
        user_id     UUID        REFERENCES profiles(id)   ON DELETE SET NULL,
        event_type  TEXT        NOT NULL,
        metadata    JSONB       NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_audit_events_document_id ON audit_events(document_id);
    CREATE INDEX idx_audit_events_company_id  ON audit_events(company_id);
    CREATE INDEX idx_audit_events_created_at  ON audit_events(created_at DESC);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS audit_events;")
    op.execute("DROP TABLE IF EXISTS ksef_submissions;")
    op.execute("DROP TABLE IF EXISTS xml_exports;")
    op.execute("DROP TABLE IF EXISTS review_actions;")
    op.execute("DROP TABLE IF EXISTS validation_errors;")
    op.execute("DROP TABLE IF EXISTS invoice_line_items;")
    op.execute("DROP TABLE IF EXISTS invoice_drafts;")
    op.execute("DROP TABLE IF EXISTS ocr_results;")
    op.execute("DROP TABLE IF EXISTS documents;")
    op.execute("DROP TABLE IF EXISTS company_memberships;")
    op.execute("DROP TABLE IF EXISTS profiles;")
    op.execute("DROP TABLE IF EXISTS companies;")
