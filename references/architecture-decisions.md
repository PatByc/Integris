# Architecture Decisions

## Chosen stack

Frontend:
- Next.js
- TypeScript
- Tailwind
- shadcn/ui

Backend:
- FastAPI
- Python
- Pydantic

Database:
- Supabase Postgres

Auth:
- Supabase Auth

Storage:
- Supabase Storage

Queue:
- Redis

Workers:
- Python workers

OCR:
- Google Cloud Vision OCR

AI:
- LLM for invoice extraction and normalization only

XML:
- deterministic FA(3) XML generation

KSeF:
- KSeF 2.0 / FA(3)
- sandbox first

Hosting:
- TBD after local MVP
- likely Vercel for frontend
- Railway/Fly/Render for backend/workers
- Supabase for DB/auth/storage

Payments:
- not in MVP

---

## ADR-001: Use web app as core product

Reason:
The core workflow needs review queues, users, audit logs, statuses, approvals, and centralized KSeF updates.

Tradeoffs:
A desktop app could access local folders more easily, but creates installation, update, and support overhead.

Decision:
Build web app first. Add optional local connector later if needed.

Date:
Initial MVP.

---

## ADR-002: Use FastAPI backend instead of Next.js-only backend

Reason:
The product will require document processing, OCR orchestration, AI extraction, validation, XML generation, KSeF integration, and workers. Python is better suited for this processing layer.

Tradeoffs:
More moving parts than a pure Next.js/Supabase MVP.

Decision:
Use Next.js frontend + FastAPI backend + workers from the start.

Date:
Initial MVP.

---

## ADR-003: Use Supabase Postgres/Auth/Storage

Reason:
Supabase provides fast MVP setup while keeping a real Postgres database. Auth and Storage reduce infrastructure work.

Tradeoffs:
Vendor dependency during MVP.

Decision:
Use Supabase for database, auth, and file storage.

Date:
Initial MVP.

---

## ADR-004: Use Google Cloud Vision OCR for MVP

Reason:
OCR is not the product moat. Google Vision is good enough for early validation and has a low/free usage tier.

Tradeoffs:
Vision OCR returns raw text, not invoice structure. Additional extraction logic is required.

Decision:
Use Google Vision OCR for PDF/image text extraction.

Date:
Initial MVP.

---

## ADR-005: Separate OCR, AI extraction, validation, and XML generation

Reason:
Each stage has different reliability requirements.

- OCR reads text.
- AI extraction interprets text.
- validation determines correctness.
- XML generation formats approved data.

Tradeoffs:
More pipeline complexity, but much safer and easier to debug.

Decision:
Keep these as separate services/modules.

Date:
Initial MVP.

---

## ADR-006: AI must not generate final XML

Reason:
Final FA(3) XML must be deterministic, testable, and schema-aware.

Tradeoffs:
Requires explicit internal invoice schema and mapper.

Decision:
LLM may produce structured invoice draft JSON only. Deterministic code generates XML.

Date:
Initial MVP.

---

## ADR-007: Human review before KSeF submission

Reason:
Invoice extraction can be wrong. Users need control and responsibility before submission.

Tradeoffs:
Less automation, but more trust and compliance safety.

Decision:
Require human approval before XML generation/submission in MVP.

Date:
Initial MVP.

---

## ADR-008: Explicit document state machine

Reason:
Document processing has many failure modes. Vague statuses create bugs and user confusion.

Decision:
Use explicit statuses:

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

Date:
Initial MVP.