# Ideas and todo's for a post-MVP product.

## Export Report
Allow users to download the current filtered invoice list as CSV or XLSX.
Requires a new backend endpoint (GET /api/v1/documents/export) that streams a file.
The button is already placed on the dashboard (disabled).

## Upload Batch
Allow users to upload multiple PDF invoices in a single operation.
Requires multipart form handling for arrays of files in the upload endpoint.
The button is already placed on the dashboard (disabled).

