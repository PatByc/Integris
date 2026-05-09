# Integris Roadmap

## Phase 0 — Project scaffold

Goal:
Create repo structure, docs, env examples, basic local setup.

Deliverables:
- frontend app scaffold
- backend app scaffold
- worker scaffold
- Supabase setup notes
- initial database schema draft

Acceptance:
- frontend runs locally
- backend runs locally
- basic health endpoint works
- git initialized

---

## Phase 1 — Auth, company, upload

Goal:
Allow authenticated users to upload invoice PDFs.

Deliverables:
- Supabase Auth integration
- company model
- document model
- Supabase Storage upload
- document list page

Acceptance:
- user can sign in
- user can upload PDF
- PDF is stored
- document row is created
- document is scoped to company

---

## Phase 2 — OCR pipeline

Goal:
Process uploaded PDF with Google Vision OCR.

Deliverables:
- OCR worker
- OCR result table
- status transitions
- retry on OCR failure

Acceptance:
- uploaded PDF enters OCR processing
- raw OCR text is saved
- OCR failure is visible and retryable

---

## Phase 3 — AI extraction

Goal:
Convert OCR text into structured invoice draft JSON.

Deliverables:
- invoice draft schema
- extraction service
- AI provider integration
- schema validation for AI output
- extraction error handling

Acceptance:
- OCR text becomes invoice draft
- invalid AI output fails safely
- extracted fields are saved

---

## Phase 4 — Validation engine

Goal:
Run deterministic validation on invoice drafts.

Deliverables:
- validation service
- validation errors table
- basic rules:
  - required fields
  - NIP
  - dates
  - totals
  - VAT consistency
  - duplicates

Acceptance:
- invalid invoice shows field-level errors
- valid invoice can move to review/approval

---

## Phase 5 — Human review UI

Goal:
Allow user to review and correct extracted invoice data.

Deliverables:
- review queue
- PDF preview
- editable form
- validation error display
- approve action

Acceptance:
- user can edit fields
- validation reruns after save
- user can approve valid invoice
- corrections are audit logged

---

## Phase 6 — FA(3) XML generation

Goal:
Generate XML from approved invoice data.

Deliverables:
- internal invoice canonical model
- FA(3) mapper
- XML export table
- XML preview/download

Acceptance:
- approved invoice generates XML
- XML is stored
- XML generation is deterministic
- XML generation is audit logged

---

## Phase 7 — KSeF sandbox submission

Goal:
Submit XML to KSeF sandbox and show status.

Deliverables:
- KSeF client
- auth/session handling
- submit XML
- status handling
- rejection handling
- retry/idempotency basics

Acceptance:
- XML can be submitted to sandbox
- response is stored
- accepted/rejected status is visible
- failures are retryable where safe

---

## Phase 8 — Hardening

Goal:
Make MVP demo/pilot ready.

Deliverables:
- tests
- error states
- audit view
- permission checks
- logging
- deployment docs

Acceptance:
- core flow works end-to-end
- major failure modes are handled
- company isolation is verified
- manual QA checklist passes