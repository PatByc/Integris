# Integris — Claude Project Guide

## What this is

Integris is a B2B middleware web application for Polish companies that need to process invoice documents and submit them to KSeF without replacing their existing ERP/accounting workflows.

The MVP focuses on:

PDF invoice → OCR → AI extraction → structured invoice JSON → validation → human review → FA(3) XML → KSeF submission → audit trail.

## What this is not

Do not build:
- chatbot
- copilot
- generic AI assistant
- autonomous accounting employee
- full ERP replacement
- desktop-first software
- custom OCR engine
- microservice-heavy architecture

## Core positioning

Integris is a KSeF bridge for legacy ERP/accounting workflows.

Primary promise:

“Connect existing invoice workflows to KSeF without replacing the ERP.”

## Chosen stack

Frontend:
- Next.js
- TypeScript
- Tailwind
- shadcn/ui

Backend:
- FastAPI
- Python 3.12 (do not use 3.14 yet)
- Pydantic

Database/Auth/Storage:
- Supabase Postgres
- Supabase Auth
- Supabase Storage

Queue/workers:
- Redis
- Python workers

OCR:
- Google Cloud Vision OCR

AI:
- LLM-based invoice extraction/normalization only

XML/KSeF:
- deterministic FA(3) XML generator
- KSeF sandbox connector first

## Architecture rule

AI may interpret data.

AI must never be the source of truth.

AI must never directly generate final FA(3) XML.

Correct flow:

PDF → OCR text → AI extraction JSON → deterministic validation → human approval → deterministic XML generation → KSeF submission.

## Folder conventions

Use:

- `/frontend` for Next.js app
- `/backend` for FastAPI app
- `/workers` for background workers
- `/docs` for decisions and implementation docs
- `/references` for product/architecture context
- `/scripts` for safe helper scripts
- `/tests` for shared or integration tests if needed

## Important reference files

Read when needed:

- `references/product-brief.md`
- `references/architecture-decisions.md`
- `references/user-flows.md`
- `references/coding-standards.md`
- `references/ai-behavior.md`
- `docs/DECISIONS.md`

Do not load every reference file unless relevant.

## Workflow

For non-trivial work:

1. Inspect current repo first.
2. Read relevant docs.
3. Stay in planning mode.
4. Propose a phased plan.
5. Save the plan to `PLAN.md`.
6. Wait for approval before implementation.
7. Implement one phase at a time.
8. Run relevant tests/checks after each phase.
9. Summarize changed files.
10. Avoid unrelated refactors.

## MVP state machine

Use explicit document statuses:

- uploaded
- ocr_processing
- ocr_failed
- extraction_processing
- extraction_failed
- validation_failed
- needs_review
- approved
- xml_generated
- submission_pending
- submitted
- accepted
- rejected
- cancelled

Do not use vague statuses like `done` or `processing` without detail.

## Core backend services

Prefer clear service boundaries:

- `ocr_service`
- `invoice_extraction_service`
- `invoice_validation_service`
- `invoice_review_service`
- `fa3_xml_service`
- `ksef_submission_service`
- `audit_service`

## Coding rules

- Keep changes small and reviewable.
- Avoid unrelated refactors.
- Use strict typing where practical.
- Validate all external input.
- Never hardcode secrets.
- Never read `.env` files unless explicitly approved.
- Prefer deterministic logic for validation and XML.
- Use audit logs for important business events.
- Add tests for validation, state transitions, and XML generation.

## Security rules

- Multi-tenant isolation matters from day one.
- Every document belongs to a company.
- Every user action must be scoped to company access.
- Store PDFs in Supabase Storage with controlled access.
- Store secrets only in environment variables.
- Never expose raw provider errors directly to users.

## Gotchas

- Google Vision OCR returns text, not invoice understanding.
- AI extraction can be wrong.
- Validation must catch bad or missing data.
- Human review is required before KSeF submission.
- KSeF submission must be retryable and idempotent.
- FA(3) XML generation must be deterministic and schema-aware.
- Auditability is a core feature, not a nice-to-have.