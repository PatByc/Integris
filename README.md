# Integris

Integris is a KSeF middleware platform for Polish companies operating on legacy ERP/accounting workflows.

The system processes invoice documents and converts them into validated, reviewable, auditable FA(3) XML submissions for KSeF.

Core workflow:

```text
PDF Invoice
    ↓
OCR
    ↓
AI Extraction
    ↓
Structured Invoice JSON
    ↓
Validation
    ↓
Human Review
    ↓
FA(3) XML Generation
    ↓
KSeF Submission
    ↓
Audit Trail