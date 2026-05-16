# Ideas and todo's for a post-MVP product.

## Export Report
Allow users to download the current filtered invoice list as CSV or XLSX.
Requires a new backend endpoint (GET /api/v1/documents/export) that streams a file.
The button is already placed on the dashboard (disabled).

## Upload Batch
Allow users to upload multiple PDF invoices in a single operation.
Requires multipart form handling for arrays of files in the upload endpoint.
The button is already placed on the dashboard (disabled).

## Auto-Pass (High-Confidence Bypass)

Allow companies to opt into automatically approving documents that meet both conditions:
- AI confidence ≥ configurable threshold (e.g. 90%)
- Zero validation errors

**Why it was deferred:** Directly contradicts the core architecture principle — "human review is
required before KSeF submission." KSeF submissions are legally binding; an AI can be confidently
wrong, and a submitted incorrect FA(3) invoice creates a compliance problem with no easy undo.

**Recommended approach when implemented:**
- Off by default; clearly labelled "Experimental" in Settings
- Owner-only toggle
- Applies only to docs with confidence ≥ threshold AND error_count = 0
- Emit a distinct audit event `review.auto_approved` so it is traceable
- Display a warning on first enable: "Auto-approved invoices skip human review before KSeF submission.
  Use only for trusted, high-volume vendor templates."

**Safer alternative to implement first:** Bulk Approve — checkbox selection on the Validation
queue + one "Approve selected" button. Human still triggers it; no need to open each invoice.

---

### UI Mockup (HTML look-alike)

The Validation Queue overview page that prompted this discussion:

```html
<!DOCTYPE html>
<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Validation Queue - Integris Middleware</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
<style>
  .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    vertical-align: middle;
  }
  body { font-family: 'Inter', sans-serif; background-color: #faf9fc; }
</style>
<script id="tailwind-config">
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        "colors": {
          "secondary-fixed-dim": "#b3c5ff", "tertiary": "#000000",
          "surface-bright": "#faf9fc", "on-primary-container": "#6f84ad",
          "secondary-container": "#0266ff", "on-secondary-fixed-variant": "#003fa4",
          "inverse-on-surface": "#f2f0f4", "on-error-container": "#93000a",
          "inverse-primary": "#b2c7f3", "outline": "#74777f",
          "secondary": "#0050cc", "on-surface-variant": "#44474e",
          "on-primary-fixed": "#011b3e", "background": "#faf9fc",
          "tertiary-fixed-dim": "#feb696", "surface-container-high": "#e9e7eb",
          "secondary-fixed": "#dae1ff", "on-tertiary-fixed": "#351000",
          "on-error": "#ffffff", "surface-container-lowest": "#ffffff",
          "surface-container-low": "#f5f3f6", "surface-tint": "#4a5f85",
          "surface-container": "#efedf1", "on-surface": "#1b1b1e",
          "primary-container": "#011b3e", "error": "#ba1a1a",
          "surface": "#faf9fc", "on-secondary": "#ffffff",
          "surface-variant": "#e3e2e5", "primary-fixed": "#d7e3ff",
          "on-secondary-container": "#f9f7ff", "surface-dim": "#dbd9dd",
          "surface-container-highest": "#e3e2e5", "primary": "#000000",
          "on-primary-fixed-variant": "#32476c", "on-tertiary": "#ffffff",
          "error-container": "#ffdad6", "on-tertiary-container": "#b37559",
          "tertiary-container": "#351000", "tertiary-fixed": "#ffdbcc",
          "on-tertiary-fixed-variant": "#6b3a22", "on-primary": "#ffffff",
          "outline-variant": "#c4c6cf", "on-secondary-fixed": "#001849",
          "inverse-surface": "#303033", "primary-fixed-dim": "#b2c7f3",
          "on-background": "#1b1b1e"
        }
      }
    }
  }
</script>
</head>
<body class="bg-background text-on-surface">
<main class="p-lg max-w-container-max mx-auto">
  <section class="mb-lg flex items-end justify-between">
    <div>
      <h2 class="font-display-lg text-display-lg text-primary mb-1">Validation Queue</h2>
      <p class="font-body-base text-body-base text-on-surface-variant">Manual review required for <span class="font-bold text-error">12 unresolved</span> conflicts.</p>
    </div>
    <div class="flex gap-sm">
      <button class="flex items-center gap-xs px-md py-2 bg-secondary text-on-secondary font-bold rounded-lg hover:opacity-90 transition-all">
        Batch Validate
      </button>
    </div>
  </section>
  <section class="grid grid-cols-4 gap-md mb-lg">
    <div class="bg-surface-container-lowest p-md border border-outline-variant rounded-lg">
      <div class="flex items-center justify-between mb-sm">
        <span class="font-label-caps text-label-caps text-on-surface-variant">Total Errors</span>
      </div>
      <div class="font-headline-md text-headline-md font-bold">248</div>
      <div class="text-[11px] text-on-surface-variant mt-1">+12% vs last week</div>
    </div>
    <div class="bg-surface-container-lowest p-md border border-outline-variant rounded-lg">
      <div class="flex items-center justify-between mb-sm">
        <span class="font-label-caps text-label-caps text-on-surface-variant">High Severity</span>
      </div>
      <div class="font-headline-md text-headline-md font-bold text-error">12</div>
      <div class="text-[11px] text-on-surface-variant mt-1">Requiring immediate fix</div>
    </div>
    <div class="bg-surface-container-lowest p-md border border-outline-variant rounded-lg">
      <div class="flex items-center justify-between mb-sm">
        <span class="font-label-caps text-label-caps text-on-surface-variant">Avg Resolution</span>
      </div>
      <div class="font-headline-md text-headline-md font-bold">4.2m</div>
      <div class="text-[11px] text-on-surface-variant mt-1">Manual intervention time</div>
    </div>
    <div class="bg-surface-container-lowest p-md border border-outline-variant rounded-lg">
      <div class="flex items-center justify-between mb-sm">
        <span class="font-label-caps text-label-caps text-on-surface-variant">Accuracy Rate</span>
      </div>
      <div class="font-headline-md text-headline-md font-bold">98.4%</div>
      <div class="text-[11px] text-on-surface-variant mt-1">Post-validation reliability</div>
    </div>
  </section>
  <section class="bg-surface-container-lowest border border-outline-variant overflow-hidden shadow-sm">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b border-outline-variant bg-surface-container-low">
          <th class="px-md py-sm font-label-caps text-label-caps text-on-surface-variant">Filename / ID</th>
          <th class="px-md py-sm font-label-caps text-label-caps text-on-surface-variant">Error Type</th>
          <th class="px-md py-sm font-label-caps text-label-caps text-on-surface-variant">Confidence</th>
          <th class="px-md py-sm font-label-caps text-label-caps text-on-surface-variant">Vendor</th>
          <th class="px-md py-sm font-label-caps text-label-caps text-on-surface-variant">Date Added</th>
          <th class="px-md py-sm font-label-caps text-label-caps text-on-surface-variant text-right">Action</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-outline-variant">
        <tr class="hover:bg-surface-container-low">
          <td class="px-md py-sm">
            <span class="block font-semibold">INV-2023-0042.pdf</span>
            <span class="text-[11px] text-on-surface-variant">ID: 8829-XJ2</span>
          </td>
          <td class="px-md py-sm">
            <span class="bg-error/10 text-error px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 border border-error/20">
              <span class="w-1.5 h-1.5 rounded-full bg-error"></span> INVALID NIP
            </span>
          </td>
          <td class="px-md py-sm">
            <div class="w-24 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div class="bg-error h-full" style="width: 42%;"></div>
            </div>
            <span class="text-[10px] text-error">42% Confidence</span>
          </td>
          <td class="px-md py-sm">Amazon AWS</td>
          <td class="px-md py-sm">2023-10-31 09:12</td>
          <td class="px-md py-sm text-right">
            <button class="bg-secondary text-on-secondary px-4 py-1.5 rounded font-label-caps text-label-caps">FIX</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
  <section class="grid grid-cols-3 gap-md mt-lg">
    <div class="col-span-2 bg-secondary-container/5 border border-secondary/20 p-lg rounded-xl">
      <h3 class="font-title-sm text-secondary mb-2">Automated Rules Status</h3>
      <p class="text-on-surface-variant max-w-md">Our system flags entries below the confidence threshold for human review. Last batch processed 1,240 documents with a 91% auto-pass rate.</p>
      <div class="flex gap-md mt-md">
        <div>
          <span class="text-secondary font-bold">91.4%</span>
          <span class="text-[10px] text-on-surface-variant block">AUTO-PASSED</span>
        </div>
        <div>
          <span class="text-error font-bold">8.6%</span>
          <span class="text-[10px] text-on-surface-variant block">MANUAL QUEUE</span>
        </div>
      </div>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl">
      <h3 class="font-title-sm text-primary mb-1">Queue Health</h3>
      <p class="text-on-surface-variant">Current backlog is <span class="text-secondary font-bold">Normal</span>.</p>
    </div>
  </section>
</main>
</body></html>
```

