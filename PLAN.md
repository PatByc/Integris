# Integris — Implementation Plan

## Context

Integris is a B2B middleware web application that bridges Polish companies' existing invoice workflows with KSeF (Krajowy System e-Faktur), Poland's mandatory national e-invoicing platform. Companies upload PDF invoices; the system OCRs them, extracts structured data via LLM, validates against Polish fiscal rules, routes them through a human review queue, generates deterministic FA(3) XML, submits to KSeF, and maintains a full audit trail.

The project is at **Phase 0**: all documentation is complete (SPEC.md, ROADMAP.md, architecture-decisions.md, product-brief.md, ai-behavior.md, coding-standards.md), but `app/`, `scripts/`, and `tests/` are empty. No implementation code exists yet.

---

## Current Repo State

```
Integris/
├── .claude/settings.json         # permissions config (read/edit/write allowed; install/push/deploy denied)
├── app/                          # EMPTY — scaffold target
├── docs/DECISIONS.md             # template only
├── references/                   # 5 complete context docs
│   ├── ai-behavior.md
│   ├── architecture-decisions.md
│   ├── coding-standards.md
│   ├── product-brief.md
│   └── user-flows.md
├── scripts/                      # EMPTY
├── tests/                        # EMPTY
├── .env.example                  # all env vars defined
├── CLAUDE.md                     # complete project guide
├── PLAN.md                       # this file
├── README.md                     # EMPTY
├── ROADMAP.md                    # 8-phase plan
└── SPEC.md                       # MVP spec + 10 acceptance criteria
```

---

## Missing Requirements / Gaps Identified

| # | Gap | Impact | Recommended Action |
|---|-----|--------|--------------------|
| 1 | No FA(3) XML schema file or reference | High — FA(3) structure must be exact | Obtain official KSeF FA(3) XSD/schema before Phase 6 |
| 2 | KSeF auth flow not documented | High — sandbox integration blocked | Research KSeF 2.0 API auth (likely token/certificate-based) |
| 3 | No database migration strategy defined | High — schema must be reproducible | Use Supabase migrations or Alembic |
| 4 | No AI prompt template | Medium — extraction quality depends on it | Draft prompt in Phase 3; iterate |
| 5 | LLM confidence threshold not defined | Medium — when does low confidence block flow? | Define threshold in Phase 3 |
| 6 | No Redis queue schema / job format | Medium — worker contract undefined | Define in Phase 2 |
| 7 | File size / PDF limits not specified | Medium — storage and OCR cost control | Default: 25 MB max per file |
| 8 | Retry policy details absent | Medium — max retries, backoff not defined | Default: 3 retries, exponential backoff |
| 9 | Company onboarding flow undefined | Medium — self-signup vs admin-invite? | Assume: self-signup creates company; invite adds members |
| 10 | Role permissions granularity incomplete | Low — Owner/Operator/Viewer roles exist; exact permission matrix not written | Define in Phase 1 |
| 11 | Email notifications not mentioned | Low — no SMTP/email config in .env.example | Out of MVP scope; flag for post-MVP |
| 12 | NIP checksum algorithm not documented | Low — standard Polish algorithm | Implement standard modulo-11 NIP validation |
| 13 | Multi-currency handling | Low — KSeF is PLN-focused | Default to PLN only; reject other currencies in validation |
| 14 | README.md is empty | Low — no setup docs | Fill in Phase 0 |
| 15 | `invoice_review_service` in CLAUDE.md but not SPEC.md | Low | Treat as part of review UI layer, not a separate backend service |

---

## Assumptions

1. **Single currency (PLN)** — KSeF's FA(3) format is PLN-centric; multi-currency is post-MVP.
2. **Self-signup company creation** — A user who signs up can create a company; additional members join via invite link.
3. **PDF only at MVP** — No email ingestion, folder watch, or ERP export support in MVP.
4. **OpenAI as LLM provider** — gpt-4.1-mini per .env.example; provider abstracted behind an interface.
5. **Supabase Storage for PDFs** — Bucket named `invoices`; signed URLs for review UI PDF previews.
6. **Redis for job queue** — Python workers pull jobs from Redis; no managed queue service (SQS, etc.).
7. **KSeF sandbox only at MVP** — No production KSeF submission in initial release.
8. **Alembic for DB migrations** — Backend manages schema via Alembic; Supabase used as managed Postgres host.
9. **No email notifications** — Status updates visible in UI only during MVP.
10. **Confidence threshold = 0.7** — AI extraction fields below 70% confidence are flagged for mandatory human review.
11. **Max PDF size = 25 MB** — Enforced at upload; hard-blocked at API layer.
12. **Retry policy** — 3 max retries per job, exponential backoff (5s → 30s → 120s), then mark as failed.
13. **Multi-tenant isolation** — Every DB query includes `company_id` filter; enforced at repository layer.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js Frontend (TypeScript, Tailwind, shadcn/ui)          │
│  /frontend                                                    │
│  Pages: login, dashboard, upload, review-queue, document      │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API (JWT from Supabase Auth)
┌──────────────────────▼──────────────────────────────────────┐
│  FastAPI Backend (Python, Pydantic)                          │
│  /backend/app/                                               │
│  Routes → Services → Repositories → Supabase Postgres        │
│                                                               │
│  Services:                                                    │
│  ├── ocr_service.py          (Google Vision)                 │
│  ├── invoice_extraction_service.py  (LLM)                   │
│  ├── invoice_validation_service.py  (deterministic rules)    │
│  ├── fa3_xml_service.py      (deterministic XML)             │
│  ├── ksef_submission_service.py     (KSeF API client)        │
│  └── audit_service.py        (event logging)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ Enqueue jobs
┌──────────────────────▼──────────────────────────────────────┐
│  Redis Queue + Python Workers                                │
│  /workers/                                                   │
│  ├── ocr_worker.py           (process OCR jobs)             │
│  ├── extraction_worker.py    (process extraction jobs)       │
│  └── ksef_poller.py          (poll KSeF submission status)  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Supabase                                                    │
│  ├── Postgres (all entities)                                 │
│  ├── Auth (JWT, sessions, company membership)                │
│  └── Storage (PDF files, bucket: invoices)                  │
└─────────────────────────────────────────────────────────────┘
```

**Document State Machine:**
```
uploaded → ocr_processing → ocr_failed (terminal, retryable)
                          → extraction_processing → extraction_failed (terminal, retryable)
                                                  → validation_failed → needs_review
                                                  → needs_review
                                                               → approved → xml_generated
                                                                          → submission_pending
                                                                                            → submitted → accepted (terminal)
                                                                                                        → rejected (retryable)
                                                               → cancelled (terminal)
```

---

## Phased Implementation Plan

### Phase 0 — Project Scaffold
**Goal:** Runnable local dev environment with empty but correctly structured repos.

**What gets built:**
- Next.js app in `/frontend` with TypeScript, Tailwind, shadcn/ui
- FastAPI app in `/backend` with Python virtual environment
- `/workers` directory with base worker skeleton
- Supabase project linked; base schema migrations written
- Redis docker-compose for local dev
- `README.md` filled in with local setup instructions
- Linting + type checking configured for both stacks

**Files to create:**
```
frontend/                         (Next.js init)
  package.json
  tsconfig.json
  tailwind.config.ts
  src/app/layout.tsx
  src/app/page.tsx
  src/lib/supabase.ts             (Supabase client)

backend/
  pyproject.toml / requirements.txt
  app/main.py                     (FastAPI app entry)
  app/core/config.py              (env var loading via pydantic-settings)
  app/core/database.py            (Supabase/postgres connection)
  alembic/                        (migration setup)
  alembic/versions/001_initial_schema.py

workers/
  base_worker.py
  requirements.txt

docker-compose.yml                (Redis + local services)
README.md                         (setup instructions)
```

**Database schema (migration 001):**
Tables: `companies`, `profiles`, `company_memberships`, `documents`, `ocr_results`, `invoice_drafts`, `invoice_line_items`, `validation_errors`, `review_actions`, `xml_exports`, `ksef_submissions`, `audit_events`

**Acceptance criteria:**
- [ ] `npm run dev` starts Next.js on localhost:3000
- [ ] `uvicorn app.main:app` starts FastAPI on localhost:8000
- [ ] `npm run typecheck` and `npm run lint` pass with zero errors
- [ ] `alembic upgrade head` runs without error against a local Supabase instance
- [ ] Redis container starts via `docker-compose up`
- [ ] README documents every setup step

---

### Phase 1 — Auth, Company, Upload ✅ COMPLETE (2026-05-09)
**Goal:** Users can sign up, create/join a company, and upload a PDF invoice.

**What gets built:**
- Supabase Auth integration (email/password; JWT passed to FastAPI)
- Company create + membership (owner role)
- Invite flow (token-based, basic)
- Document upload endpoint (validates PDF, max 25 MB, stores to Supabase Storage)
- Document record created with status = `uploaded`
- Dashboard showing company's documents

**Files to create/modify:**
```
backend/app/api/routes/
  auth.py                         (JWT verification middleware)
  companies.py                    (create company, get current company)
  documents.py                    (upload, list, get)

backend/app/services/
  company_service.py
  document_service.py
  audit_service.py                (log upload event)

backend/app/repositories/
  company_repository.py
  document_repository.py

backend/app/schemas/
  company_schema.py
  document_schema.py

frontend/src/
  app/(auth)/login/page.tsx
  app/(auth)/register/page.tsx
  app/dashboard/page.tsx
  app/upload/page.tsx
  components/UploadZone.tsx
  lib/api.ts                      (typed fetch client)
```

**Acceptance criteria:**
- [x] User can register, log in, log out
- [x] User can create a company on first login
- [x] User can upload a PDF (≤25 MB); rejected if too large or not PDF
- [x] Document appears in dashboard with status `uploaded`
- [x] Company A user cannot see Company B documents (enforced at API — 404 not 403)
- [x] Audit event logged on upload

**Notes:**
- Invite flow deferred — not in acceptance criteria for Phase 1
- Storage upload uses httpx directly (async-native, avoids blocking supabase-py sync client)
- NIP checksum validation (modulo-11) implemented in Pydantic schema
- `metadata` column attribute renamed to `event_metadata` in AuditEvent ORM model (SQLAlchemy reserved name)

---

### Phase 2 — OCR Pipeline
**Goal:** Uploaded PDFs are automatically processed through Google Cloud Vision OCR.

**What gets built:**
- OCR worker that picks up `uploaded` documents from Redis queue
- Google Cloud Vision API integration
- `ocr_results` record with raw text + metadata
- Status transitions: `uploaded` → `ocr_processing` → `ocr_failed` / continues to `extraction_processing`
- Retry logic (3 attempts, exponential backoff)
- UI shows OCR status on document detail page

**Files to create/modify:**
```
workers/ocr_worker.py
workers/queue.py                  (Redis job queue wrapper)

backend/app/services/
  ocr_service.py                  (Google Vision client)

backend/app/repositories/
  ocr_result_repository.py

backend/app/schemas/
  ocr_schema.py

backend/app/api/routes/
  documents.py                    (add retry endpoint for ocr_failed)

alembic/versions/002_add_ocr_results.py
```

**Acceptance criteria:**
- [ ] Uploading a PDF automatically enqueues an OCR job
- [ ] OCR result (raw text + page count) stored in `ocr_results`
- [ ] Document status updates to `ocr_processing` → `ocr_failed` or continues to extraction
- [ ] Failed OCR can be retried from the UI
- [ ] After 3 failures, document is marked `ocr_failed` (terminal until manual retry)
- [ ] Audit events logged for OCR start, success, and failure

---

### Phase 3 — AI Extraction
**Goal:** OCR text is converted to a structured invoice draft via LLM.

**What gets built:**
- Extraction worker consuming OCR results from Redis
- LLM prompt template (system + user prompt; OCR text as input)
- Pydantic schema for invoice draft (seller, buyer, line items, totals, VAT summary, dates)
- Schema validation of LLM response; confidence flagging
- `invoice_drafts` and `invoice_line_items` records created
- Status transitions: `extraction_processing` → `extraction_failed` / `validation_failed` / `needs_review`

**Files to create/modify:**
```
workers/extraction_worker.py

backend/app/services/
  invoice_extraction_service.py   (LLM call + parsing)

backend/app/schemas/
  invoice_draft_schema.py         (Pydantic model for structured invoice)

backend/app/repositories/
  invoice_draft_repository.py
  invoice_line_item_repository.py

backend/app/core/
  prompts.py                      (prompt templates)

alembic/versions/003_add_invoice_drafts.py
```

**LLM extraction output schema (key fields):**
```
seller: {name, nip, address}
buyer: {name, nip, address}
invoice_number: str
issue_date: date
sale_date: date
payment_due_date: date
payment_method: str
currency: str (expect PLN)
line_items: [{description, quantity, unit, unit_price_net, vat_rate, net_amount, vat_amount, gross_amount}]
net_total: decimal
vat_total: decimal
gross_total: decimal
vat_summary: [{rate, net_amount, vat_amount}]
confidence: float (0-1)
flags: [str]  # uncertainty markers
```

**Acceptance criteria:**
- [ ] OCR completion automatically enqueues extraction job
- [ ] Extraction produces a structured `invoice_draft` with all key fields
- [ ] Fields with confidence < 0.7 are flagged in `flags`
- [ ] Invalid/unparseable LLM response marks document as `extraction_failed`
- [ ] Extraction failure can be retried
- [ ] Audit events logged for extraction start, success, and failure

---

### Phase 4 — Validation Engine
**Goal:** Deterministic, rule-based validation of extracted invoice data.

**What gets built:**
- Validation service with rule set
- `validation_errors` table for error records
- Status transitions: all rules pass → `needs_review`; any failure → `validation_failed`

**Validation rules:**
1. Required fields present (seller NIP, buyer NIP, invoice_number, issue_date, gross_total)
2. NIP format valid (10 digits, modulo-11 checksum)
3. Issue date ≤ today; sale_date ≤ issue_date
4. payment_due_date ≥ issue_date
5. Line item math: `net_amount + vat_amount = gross_amount` per line (within 0.01 PLN tolerance)
6. Total check: sum(line net) = net_total; sum(line vat) = vat_total; net+vat = gross (within 0.01 PLN)
7. VAT summary consistency: grouped VAT rates match line items
8. Duplicate check: same seller NIP + invoice_number + issue_date within same company
9. Currency must be PLN

**Files to create/modify:**
```
backend/app/services/
  invoice_validation_service.py

backend/app/repositories/
  validation_error_repository.py

backend/app/schemas/
  validation_schema.py

backend/app/api/routes/
  documents.py                    (trigger revalidation endpoint)

alembic/versions/004_add_validation_errors.py
```

**Acceptance criteria:**
- [ ] All 9 validation rules fire deterministically
- [ ] Validation errors stored with field reference, rule name, and human-readable message
- [ ] Document with errors transitions to `validation_failed` (still routed to review for correction)
- [ ] Document with no errors transitions to `needs_review`
- [ ] Duplicate invoice detection works within the same company
- [ ] Audit event logged for each validation run

---

### Phase 5 — Human Review UI
**Goal:** Reviewers can inspect, correct, and approve invoice drafts.

**What gets built:**
- Review queue page (documents in `needs_review` or `validation_failed`)
- Document detail: PDF preview (signed URL) + extracted fields side by side
- Editable form for all extracted fields
- Validation error display with field highlighting
- Save corrections → re-run validation → show updated errors
- Approve action → transitions to `approved`
- Role guard: only Owner/Operator can approve

**Files to create/modify:**
```
frontend/src/
  app/review/page.tsx             (queue list with filters)
  app/review/[id]/page.tsx        (document detail)
  components/review/
    PdfPreview.tsx
    InvoiceForm.tsx
    ValidationErrors.tsx
    LineItemsTable.tsx
    ApproveButton.tsx

backend/app/api/routes/
  documents.py                    (update draft, approve endpoints)

backend/app/services/
  invoice_review_service.py       (coordinate update + revalidate)

backend/app/repositories/
  review_action_repository.py

alembic/versions/005_add_review_actions.py
```

**Acceptance criteria:**
- [ ] Review queue shows all documents needing attention, filterable by status
- [ ] PDF preview loads via signed URL (no direct storage exposure)
- [ ] All extracted fields are editable
- [ ] Saving corrections triggers revalidation and updates error list
- [ ] Approve button only visible/active when no validation errors remain
- [ ] Approval transitions document to `approved` and logs `review_action`
- [ ] Viewers cannot approve (403 if attempted)

---

### Phase 6 — FA(3) XML Generation
**Goal:** Approved invoices are converted to valid, deterministic FA(3) XML.

**What gets built:**
- Canonical invoice model (internal representation)
- FA(3) mapper: approved invoice draft → FA(3) XML string (no AI involved)
- XML schema validation against FA(3) XSD
- `xml_exports` record with XML content and SHA-256 hash
- XML preview + download from UI
- Status transition: `approved` → `xml_generated`

**Files to create/modify:**
```
backend/app/services/
  fa3_xml_service.py              (XML generation + XSD validation)

backend/app/models/
  canonical_invoice.py            (intermediate model)

backend/app/repositories/
  xml_export_repository.py

backend/app/api/routes/
  documents.py                    (trigger XML gen; download endpoint)

references/fa3_schema.xsd         (FA(3) XSD — must be obtained before this phase)

frontend/src/
  app/review/[id]/page.tsx        (add XML preview/download section)

alembic/versions/006_add_xml_exports.py
```

**Acceptance criteria:**
- [ ] FA(3) XML generated deterministically (same input → same output)
- [ ] Generated XML validates against official FA(3) XSD
- [ ] XML stored in `xml_exports` with SHA-256 hash
- [ ] Reviewer can preview and download the XML
- [ ] Audit event logged for XML generation

---

### Phase 7 — KSeF Sandbox Submission
**Goal:** Validated FA(3) XML is submitted to the KSeF sandbox and status is polled.

**What gets built:**
- KSeF API client (auth/session + XML submission)
- Submission record in `ksef_submissions`
- Status poller worker (polls KSeF for processing result)
- Status transitions: `xml_generated` → `submission_pending` → `submitted` → `accepted` / `rejected`
- Rejection handling: document transitions back to `needs_review` with KSeF error details

**Files to create/modify:**
```
backend/app/services/
  ksef_submission_service.py      (KSeF API calls)

workers/ksef_poller.py            (poll submission status)

backend/app/repositories/
  ksef_submission_repository.py

backend/app/schemas/
  ksef_schema.py

backend/app/api/routes/
  documents.py                    (trigger submission; get ksef status)

frontend/src/
  app/review/[id]/page.tsx        (show KSeF submission status + response)

alembic/versions/007_add_ksef_submissions.py
```

**Acceptance criteria:**
- [ ] Approved + XML-generated document can be submitted to KSeF sandbox
- [ ] `ksef_submissions` record created with KSeF reference ID
- [ ] Poller updates submission status to `accepted` or `rejected`
- [ ] Rejected documents show KSeF error codes; document can re-enter review
- [ ] Double-submission prevented (check for existing accepted submission)
- [ ] Audit events logged for submission, acceptance, and rejection

---

### Phase 8 — Hardening
**Goal:** Production-ready quality: tests, audit UI, role enforcement, logging, deployment docs.

**What gets built:**
- Unit tests for all validation rules (pytest)
- Unit tests for FA(3) XML generation (round-trip checks)
- Integration tests for key API endpoints (pytest + httpx)
- Audit trail view in UI (event timeline per document)
- Role permission matrix enforced at API middleware level
- Structured JSON logging (log level configurable via env)
- Error boundaries in frontend
- Deployment documentation

**Files to create/modify:**
```
tests/
  test_validation.py              (all 9 rules; edge cases)
  test_fa3_xml.py                 (round-trip; XSD validation)
  test_api_documents.py           (upload, review, approve, submit endpoints)
  test_multitenant_isolation.py   (cross-company access denied)
  fixtures/                       (sample PDFs, OCR outputs, invoice JSONs)

frontend/src/
  app/audit/[id]/page.tsx         (audit timeline)
  components/ErrorBoundary.tsx

backend/app/core/
  logging.py                      (structured JSON logger)
  permissions.py                  (role guard decorators)

docs/
  deployment.md
  local-setup.md
```

**Acceptance criteria:**
- [ ] All validation rule tests pass, including edge cases (tolerance, NIP checksum)
- [ ] XML generation tests pass for at minimum 5 sample invoices
- [ ] API integration tests cover happy path and error paths for all phases
- [ ] Multi-tenant isolation test: authenticated Company A user cannot retrieve Company B document
- [ ] Audit trail UI shows all events for a document in order
- [ ] Viewer role cannot approve or submit (403 verified by tests)
- [ ] Deployment docs sufficient for a fresh setup on Railway/Vercel

---

## Testing Strategy

| Layer | Tool | What's Tested |
|-------|------|---------------|
| Backend unit | pytest | Validation rules, XML generation, NIP checksum, service logic |
| Backend integration | pytest + httpx (TestClient) | API endpoints with real Supabase (test project) |
| Frontend type check | TypeScript compiler (`tsc --noEmit`) | Type safety across all components |
| Frontend lint | ESLint | Code quality; no implicit `any` |
| E2E (manual) | Browser | Full flow: upload → OCR → extract → validate → review → approve → XML → submit |
| Multi-tenant | pytest | Cross-company data isolation at every endpoint |
| XML conformance | lxml + XSD | FA(3) XSD validation on generated XML |

**Test data:**
- Minimum 3 sample PDF invoices (valid, valid with OCR quality issues, invalid totals)
- Mocked Google Vision responses for unit tests
- Mocked LLM responses for extraction unit tests
- KSeF sandbox for submission tests (no mocking)

---

## Rollback / Safety Notes

1. **Migrations are additive only** — No DROP TABLE or DROP COLUMN. Old columns are deprecated with a comment, removed only in a later migration.

2. **KSeF sandbox gate** — `KSEF_ENV=sandbox` is always set until explicit sign-off on production. Switching to production requires a deliberate env var change.

3. **XML never sent without human approval** — State machine enforces `xml_generated` → `submission_pending` only after `approved` state. API rejects submission requests for other states.

4. **AI output never persisted without schema validation** — `invoice_extraction_service.py` validates LLM response against Pydantic schema before any DB write. Schema mismatch marks document as `extraction_failed`, not a silent partial save.

5. **No destructive git or shell operations** — `.claude/settings.json` denies `git push`, `rm`, and `rm -rf`. All changes stay local until reviewed.

6. **Supabase Storage via signed URLs only** — No public bucket. Frontend requests signed URLs from the backend; the API verifies `company_id` ownership before generating the URL.

7. **Multi-tenant 404 not 403** — A missing or mismatched `company_id` returns 404 to avoid information leakage about document existence.

8. **KSeF rejection is recoverable** — Rejected documents transition back to `needs_review` with rejection details attached, not to a terminal failure state.

---

## Pre-Implementation Checklist

Before Phase 6 begins:
- [ ] FA(3) XSD schema file obtained from official KSeF documentation
- [ ] KSeF sandbox credentials obtained and verified

Before Phase 7 begins:
- [ ] KSeF auth flow (token/certificate mechanism) confirmed and documented

These are external dependencies that cannot be resolved by code alone.
