# Integris

B2B middleware for Polish companies to process PDF invoices and submit to KSeF (Krajowy System e-Faktur) without replacing existing ERP/accounting workflows.

## Core workflow

```
PDF Invoice → OCR → AI Extraction → Validation → Human Review → FA(3) XML → KSeF Submission → Audit Trail
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Python 3.12, Pydantic v2 |
| Database | Supabase Postgres (SQLAlchemy + asyncpg) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (bucket: `invoices`) |
| Queue | Redis + Python workers |
| OCR | Google Cloud Vision |
| AI | OpenAI (extraction/normalization only) |
| XML | Deterministic FA(3) generator (no AI) |
| KSeF | Sandbox-first submission |

## Prerequisites

- Node.js 20+
- Python 3.12+
- Docker (for Redis)
- A Supabase project (free tier works) — [supabase.com](https://supabase.com)
- Google Cloud Vision API credentials
- OpenAI API key

## Local setup

### 1. Configure environment

```bash
cp .env.example .env
# Fill in all values in .env
```

For the Next.js frontend, create `frontend/.env.local`:

```bash
cp frontend/.env.local.example frontend/.env.local
# Fill in NEXT_PUBLIC_* values
```

### 2. Start Redis

```bash
docker-compose up -d redis
```

### 3. Set up the backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

API is available at http://localhost:8000. Swagger docs at http://localhost:8000/docs.

### 4. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend is available at http://localhost:3000.

### 5. (Phase 2+) Start workers

```bash
cd workers
pip install -r requirements.txt
python ocr_worker.py
```

## Development commands

| Task | Command |
|------|---------|
| Start backend | `cd backend && uvicorn app.main:app --reload` |
| Start frontend | `cd frontend && npm run dev` |
| Run DB migrations | `cd backend && alembic upgrade head` |
| Create migration | `cd backend && alembic revision -m "description"` |
| Frontend typecheck | `cd frontend && npm run typecheck` |
| Frontend lint | `cd frontend && npm run lint` |
| Backend tests | `cd backend && pytest` |

## Project structure

```
integris/
├── frontend/              Next.js app
│   └── src/
│       ├── app/           Pages and layouts (App Router)
│       ├── components/    UI components
│       └── lib/           Supabase client, utilities
├── backend/               FastAPI app
│   ├── app/
│   │   ├── api/routes/    Route handlers
│   │   ├── core/          Config, DB connection, middleware
│   │   ├── models/        SQLAlchemy ORM models
│   │   ├── schemas/       Pydantic request/response schemas
│   │   ├── services/      Business logic
│   │   └── repositories/  Data access layer
│   └── alembic/           DB migrations
├── workers/               Background job processors
├── tests/                 Test suite
├── docs/                  Decision log
├── references/            Architecture docs, specs, standards
└── docker-compose.yml     Local services (Redis)
```

## Document state machine

```
uploaded
  → ocr_processing → ocr_failed (retryable)
                   → extraction_processing → extraction_failed (retryable)
                                           → validation_failed → needs_review
                                           → needs_review
                                                         → approved → xml_generated
                                                                    → submission_pending
                                                                                      → submitted → accepted
                                                                                                 → rejected (retryable)
                                                         → cancelled
```

## Architecture rules

- AI may interpret data. AI must never be the source of truth.
- AI must never generate FA(3) XML — XML generation is deterministic and fully testable.
- Human review is required before every KSeF submission.
- `KSEF_ENV=sandbox` until explicit production sign-off.
- Every database query filters by `company_id` (multi-tenant isolation).
