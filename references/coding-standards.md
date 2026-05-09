# Coding Standards

## General

- Prefer boring, explicit code.
- Avoid overengineering.
- Avoid unrelated refactors.
- Keep functions small.
- Keep commits and changes reviewable.
- Use clear names over clever abstractions.
- Validate all external inputs.
- Treat OCR, AI, and KSeF responses as untrusted.
- Write deterministic code for validation and XML generation.

---

## TypeScript

- Use TypeScript strict mode.
- Avoid `any` unless justified.
- Use Zod for frontend form validation and API response validation where useful.
- Keep React components focused.
- Prefer server state libraries only when needed.
- Keep business rules out of UI components.

---

## Python

- Use Pydantic models for request/response/domain schemas.
- Use type hints.
- Keep service modules focused.
- Separate routes, services, repositories, and workers.
- Do not put business logic directly inside route handlers.
- Do not swallow exceptions silently.
- Normalize provider errors before returning to frontend.

---

## Naming

Frontend:

- Components: `PascalCase`
- Hooks: `useSomething`
- Utility functions: `camelCase`
- API clients: `somethingClient`
- Forms: `SomethingForm`
- Pages/routes: follow Next.js conventions

Backend:

- modules: `snake_case`
- services: `*_service.py`
- repositories: `*_repository.py`
- schemas/models: `*_schema.py` or `models.py`
- workers: `*_worker.py`

Database:

- tables: plural snake_case
- columns: snake_case
- IDs: UUIDs
- timestamps: `created_at`, `updated_at`
- tenant field: `company_id`

---

## Suggested backend structure

```txt
backend/
├── app/
│   ├── main.py
│   ├── api/
│   ├── core/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   │   ├── ocr_service.py
│   │   ├── invoice_extraction_service.py
│   │   ├── invoice_validation_service.py
│   │   ├── fa3_xml_service.py
│   │   ├── ksef_submission_service.py
│   │   └── audit_service.py
│   ├── repositories/
│   └── workers/
└── tests/