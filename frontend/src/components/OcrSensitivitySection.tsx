"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Props {
  initialThreshold: number;
  token: string;
  isOwner: boolean;
}

export function OcrSensitivitySection({ initialThreshold, token, isOwner }: Props) {
  const [threshold, setThreshold] = useState(initialThreshold);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch(`${API_URL}/api/v1/companies/me/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ocr_confidence_threshold: threshold }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
        OCR Sensitivity
      </h2>
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Confidence Threshold</label>
            <span className="text-sm font-semibold text-gray-900">{threshold}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={threshold}
            disabled={!isOwner}
            onChange={(e) => {
              setThreshold(Number(e.target.value));
              setStatus("idle");
            }}
            className="h-2 w-full cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Flag invoices below this score for manual review.
        </p>

        {isOwner ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {status === "saved" && (
              <span className="text-sm text-green-600">Saved</span>
            )}
            {status === "error" && (
              <span className="text-sm text-red-600">Failed to save</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Only the owner can change this setting.</p>
        )}
      </div>
    </section>
  );
}
