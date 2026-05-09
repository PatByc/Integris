# User Flows

## Primary MVP flow: PDF invoice to KSeF

1. User signs in.
2. User selects company/workspace.
3. User uploads PDF invoice.
4. System stores PDF in Supabase Storage.
5. System creates document record with status `uploaded`.
6. OCR worker processes PDF using Google Vision OCR.
7. System saves raw OCR text.
8. AI extraction worker converts OCR text into structured invoice draft JSON.
9. Validation service checks extracted invoice data.
10. If validation errors exist, document status becomes `needs_review`.
11. User opens review screen.
12. User sees PDF preview and extracted fields side by side.
13. User corrects fields.
14. System re-validates data.
15. User approves invoice.
16. System generates FA(3) XML.
17. System validates XML against schema where possible.
18. System submits invoice to KSeF sandbox.
19. System stores KSeF response.
20. User sees final status and audit trail.

---

## Review flow

1. User opens review queue.
2. User filters by status:
   - needs review
   - failed extraction
   - rejected by KSeF
3. User opens document.
4. UI shows:
   - PDF preview
   - extracted fields
   - validation errors
   - confidence/warnings where available
5. User edits fields.
6. User saves corrections.
7. System re-runs validation.
8. User approves only when blocking errors are gone.

---

## Error flow: OCR failure

1. OCR worker fails.
2. Document status becomes `ocr_failed`.
3. System stores provider error internally.
4. UI shows safe user-facing message.
5. User can retry OCR.
6. Retry creates audit event.

---

## Error flow: extraction failure

1. OCR succeeds.
2. AI extraction fails or returns invalid JSON.
3. Document status becomes `extraction_failed`.
4. System stores failure reason.
5. User can retry extraction.
6. Admin/dev logs preserve enough detail for debugging.

---

## Error flow: validation failure

1. Extraction returns structured JSON.
2. Validation detects missing or inconsistent data.
3. Document status becomes `needs_review` or `validation_failed`.
4. UI displays field-level errors.
5. User fixes fields manually.
6. Validation runs again.

---

## Error flow: KSeF rejection

1. XML submission is rejected.
2. System stores KSeF error response.
3. Document status becomes `rejected`.
4. UI shows normalized rejection reason.
5. User can return document to review.
6. Corrections and resubmission are audit logged.

---

## Admin/company flow

1. Admin creates company/workspace.
2. Admin invites users.
3. Admin assigns roles.
4. Admin configures KSeF sandbox credentials.
5. Admin views document processing status.
6. Admin can inspect audit logs.

---

## Roles

MVP roles:

### Owner/Admin

Can:
- manage company
- invite users
- configure KSeF credentials
- upload documents
- review documents
- approve submissions
- view audit logs

### Operator/Accountant

Can:
- upload documents
- review documents
- correct extracted data
- approve if permission allows

### Viewer

Can:
- view documents
- view statuses
- view audit history

Cannot:
- approve
- submit
- edit credentials

---

## Edge cases

Handle:

- empty PDF
- scanned PDF with poor OCR
- multi-page invoice
- missing seller NIP
- missing buyer NIP
- invalid NIP
- totals mismatch
- VAT summary mismatch
- duplicated invoice number for same seller
- unsupported currency
- buyer/seller swapped
- invalid date
- already submitted document
- failed storage upload
- failed worker job
- expired auth session
- unauthorized company access