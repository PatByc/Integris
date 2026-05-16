interface Props {
  confidence: number | null;
  flags: string[] | null;
  threshold: number;
}

export function ConfidenceBanner({ confidence, flags, threshold }: Props) {
  if (confidence === null) return null;

  const pct = Math.round(confidence * 100);
  const belowThreshold = pct < threshold;

  let barColor = "bg-green-500";
  if (pct < threshold - 15) barColor = "bg-red-500";
  else if (pct < threshold) barColor = "bg-amber-400";

  return (
    <div className="mb-4 space-y-2">
      {/* Confidence meter */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span className="font-medium">AI Confidence</span>
          <span className="font-semibold text-gray-800">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Warning banner */}
      {belowThreshold && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="mt-px flex-shrink-0">⚠</span>
          <span>
            AI confidence ({pct}%) is below your threshold ({threshold}%) — review this invoice carefully.
          </span>
        </div>
      )}

      {/* Flags */}
      {flags && flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {flags.map((flag) => (
            <span
              key={flag}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {flag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
