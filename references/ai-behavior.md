# AI Behavior

This file defines the behavior of the AI inside Integris.

It is not instructions for Claude Code.
It defines how the application’s own AI extraction layer should behave.

## AI role

The in-app AI is an invoice extraction and normalization layer.

It receives OCR output from Google Cloud Vision and returns structured invoice draft JSON.

The AI may:

- identify invoice fields
- normalize dates
- normalize NIP values
- identify seller and buyer
- extract line items
- extract VAT summaries
- extract totals
- flag uncertainty
- return confidence metadata

The AI must not:

- approve invoices
- submit to KSeF
- generate final FA(3) XML
- bypass validation
- decide legal or tax correctness
- invent missing data
- hide uncertainty

## Correct AI pipeline

```text
PDF
↓
Google Vision OCR
↓
raw OCR text
↓
AI extraction / normalization
↓
structured invoice draft JSON
↓
schema validation
↓
deterministic invoice validation
↓
human review
↓
FA(3) XML generation
↓
KSeF submission