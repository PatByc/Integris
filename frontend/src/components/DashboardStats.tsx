interface DashboardStatsProps {
  pendingReview: number;
  awaitingSubmission: number;
  awaitingSubmissionGrossTotal: number;
  ocrSuccessRate: number | null;
}

function formatPLN(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DashboardStats({
  pendingReview,
  awaitingSubmission,
  awaitingSubmissionGrossTotal,
  ocrSuccessRate,
}: DashboardStatsProps) {
  const pct = ocrSuccessRate !== null ? `${(ocrSuccessRate * 100).toFixed(1)}%` : "—";
  const barWidth = ocrSuccessRate !== null ? `${(ocrSuccessRate * 100).toFixed(0)}%` : "0%";

  return (
    <div className="mb-6 grid grid-cols-3 gap-4">
      {/* Pending Review */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pending Review</p>
          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <p className="text-3xl font-bold text-gray-900">{pendingReview}</p>
        <p className="mt-1 text-xs text-gray-400">invoices need attention</p>
      </div>

      {/* Awaiting Submission */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Awaiting Submission</p>
          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-3xl font-bold text-gray-900">{awaitingSubmission}</p>
        <p className="mt-1 text-xs text-gray-400">{formatPLN(awaitingSubmissionGrossTotal)} total</p>
      </div>

      {/* OCR Accuracy */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">OCR Accuracy</p>
          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-bold text-gray-900">{pct}</p>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: barWidth }} />
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-400">of OCR extractions succeeded</p>
      </div>
    </div>
  );
}
