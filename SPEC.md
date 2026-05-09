# Integris MVP Spec

## Product

Integris is a KSeF middleware web app for processing PDF invoices into validated, reviewed, auditable FA(3) XML and submitting them to KSeF.

## MVP scope

Build the minimum reliable workflow:

PDF upload
→ OCR
→ AI extraction
→ structured invoice draft
→ validation
→ human review
→ approval
→ FA(3) XML generation
→ KSeF sandbox submission
→ audit trail

## Non-goals

Do not build:

- ERP integrations
- desktop app
- RPA
- chatbot
- copilot
- autonomous accounting agent
- payment system
- analytics dashboard
- production KSeF submission before sandbox is stable

## Core entities

- company
- user/profile
- company_membership
- document
- ocr_result
- invoice_draft
- invoice_line_item
- validation_error
- review_action
- xml_export
- ksef_submission
- audit_event

## Required features

### Auth/company

- user can sign in
- user belongs to company
- documents are scoped to company

### Upload

- user uploads PDF
- file is stored in Supabase Storage
- document row is created

### OCR

- worker sends PDF/pages to Google Vision OCR
- raw OCR text is saved
- status changes are tracked

### AI extraction

- worker converts OCR text into structured invoice draft JSON
- output must match schema
- invalid AI output must fail safely

### Validation

- required fields
- NIP format
- date format
- net/VAT/gross consistency
- line items vs totals
- duplicate detection basics

### Review

- PDF preview
- editable extracted fields
- visible validation errors
- save corrections
- revalidate after save
- approve when valid

### XML

- generate FA(3)-compatible XML from approved data
- store XML export
- do not use AI for XML generation

### KSeF

- submit to sandbox
- poll/check status where needed
- store response
- show accepted/rejected state

### Audit

Track:

- upload
- OCR started/completed/failed
- extraction started/completed/failed
- validation completed
- user correction
- approval
- XML generation
- KSeF submission
- KSeF response

## Acceptance criteria

MVP is done when:

1. A PDF invoice can be uploaded.
2. OCR text is stored.
3. AI extraction produces editable invoice fields.
4. Validation errors are shown clearly.
5. User can correct and approve invoice.
6. System generates XML from approved data.
7. System submits to KSeF sandbox.
8. Status and audit trail are visible.
9. Failed OCR/extraction/submission can be retried.
10. Company A cannot access Company B documents.