"""
API route tests using FastAPI TestClient with dependency overrides.
No real DB or Supabase required — repositories are patched per test.
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.deps import get_current_membership, get_current_user
from app.core.database import get_db

# ── Shared identities ─────────────────────────────────────────────────────────

COMPANY_A_ID = uuid4()
COMPANY_B_ID = uuid4()
USER_A_ID = str(uuid4())
DOC_ID = str(uuid4())


# ── Dependency stubs ──────────────────────────────────────────────────────────

def _user_a():
    return {"user_id": USER_A_ID, "email": "a@test.com"}


def _mock_get_db():
    async def _inner():
        yield AsyncMock()
    return _inner


class _Membership:
    def __init__(self, role: str = "owner"):
        self.company_id = COMPANY_A_ID
        self.role = role
        self.user_id = USER_A_ID


def _membership(role: str = "owner"):
    m = _Membership(role)
    def _dep():
        return m
    return _dep


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def owner_client():
    """TestClient authenticated as company-A owner."""
    app.dependency_overrides[get_current_user] = _user_a
    app.dependency_overrides[get_current_membership] = _membership("owner")
    app.dependency_overrides[get_db] = _mock_get_db()
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def viewer_client():
    """TestClient authenticated as company-A viewer."""
    app.dependency_overrides[get_current_user] = _user_a
    app.dependency_overrides[get_current_membership] = _membership("viewer")
    app.dependency_overrides[get_db] = _mock_get_db()
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def anon_client():
    """TestClient with no auth overrides (hits real deps → 401/403)."""
    app.dependency_overrides.clear()
    # Override get_db to prevent real DB connection attempts
    app.dependency_overrides[get_db] = _mock_get_db()
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ── Auth enforcement ──────────────────────────────────────────────────────────

def test_list_documents_no_auth_returns_error(anon_client):
    """Without valid auth, listing documents must be rejected."""
    resp = anon_client.get("/api/v1/documents")
    # Supabase auth will fail → 401 or 403 (depends on exact error path)
    assert resp.status_code in (401, 403, 422)


def test_upload_no_auth_returns_error(anon_client):
    resp = anon_client.post(
        "/api/v1/documents/upload",
        files={"file": ("test.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert resp.status_code in (401, 403, 422)


# ── Role enforcement ──────────────────────────────────────────────────────────

def test_viewer_cannot_approve(viewer_client):
    """Viewer role must be rejected with 403 on the approve endpoint."""
    fake_doc = MagicMock()
    fake_doc.status = "needs_review"
    fake_doc.company_id = COMPANY_A_ID

    with patch("app.api.routes.documents.get_by_id", new_callable=AsyncMock, return_value=fake_doc):
        resp = viewer_client.post(f"/api/v1/documents/{DOC_ID}/approve")

    assert resp.status_code == 403



# ── Multi-tenant isolation ────────────────────────────────────────────────────

def test_get_document_returns_404_for_other_company(owner_client):
    """
    get_by_id is called with the caller's company_id (COMPANY_A).
    Patching it to return None simulates a document that belongs to COMPANY_B.
    """
    with patch("app.api.routes.documents.get_by_id", new_callable=AsyncMock, return_value=None):
        resp = owner_client.get(f"/api/v1/documents/{DOC_ID}")

    assert resp.status_code == 404


def test_delete_document_returns_404_for_other_company(owner_client):
    with patch("app.api.routes.documents.get_by_id", new_callable=AsyncMock, return_value=None):
        resp = owner_client.delete(f"/api/v1/documents/{DOC_ID}")

    assert resp.status_code == 404


def test_get_draft_returns_404_for_other_company(owner_client):
    with patch("app.api.routes.documents.get_by_id", new_callable=AsyncMock, return_value=None):
        resp = owner_client.get(f"/api/v1/documents/{DOC_ID}/draft")

    assert resp.status_code == 404


def test_get_xml_returns_404_for_other_company(owner_client):
    with patch("app.api.routes.documents.get_by_id", new_callable=AsyncMock, return_value=None):
        resp = owner_client.get(f"/api/v1/documents/{DOC_ID}/xml-export")

    assert resp.status_code == 404


# ── State machine enforcement ─────────────────────────────────────────────────

def test_retry_ocr_wrong_status_returns_422(owner_client):
    """retry-ocr only accepts ocr_failed; other statuses return 422."""
    fake_doc = MagicMock()
    fake_doc.status = "needs_review"
    fake_doc.company_id = COMPANY_A_ID

    with patch("app.api.routes.documents.get_by_id", new_callable=AsyncMock, return_value=fake_doc):
        resp = owner_client.post(f"/api/v1/documents/{DOC_ID}/retry-ocr")

    assert resp.status_code == 422


def test_submit_wrong_status_returns_422(owner_client):
    """submit only accepts xml_generated; other statuses return 422."""
    fake_doc = MagicMock()
    fake_doc.status = "needs_review"
    fake_doc.company_id = COMPANY_A_ID

    with patch("app.api.routes.documents.get_by_id", new_callable=AsyncMock, return_value=fake_doc):
        resp = owner_client.post(f"/api/v1/documents/{DOC_ID}/submit")

    assert resp.status_code == 422


def test_retry_submission_wrong_status_returns_422(owner_client):
    """retry-submission only accepts rejected; other statuses return 422."""
    fake_doc = MagicMock()
    fake_doc.status = "needs_review"
    fake_doc.company_id = COMPANY_A_ID

    with patch("app.api.routes.documents.get_by_id", new_callable=AsyncMock, return_value=fake_doc):
        resp = owner_client.post(f"/api/v1/documents/{DOC_ID}/retry-submission")

    assert resp.status_code == 422
