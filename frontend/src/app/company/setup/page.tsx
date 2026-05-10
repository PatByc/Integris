"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import logo from "@/logo.png";
import { apiPost, ApiError } from "@/lib/api";

export default function CompanySetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nip, setNip] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/v1/companies", { name, nip });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <Image src={logo} alt="Integris" height={36} className="mb-6 h-9 w-auto" />
        <h1 className="mb-2 text-2xl font-bold">Set up your company</h1>
        <p className="mb-6 text-sm text-gray-600">
          You&apos;ll be the owner of this company workspace.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Company name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              NIP
            </label>
            <input
              type="text"
              required
              pattern="\d{10}"
              maxLength={10}
              value={nip}
              onChange={(e) => setNip(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              10-digit Polish tax identifier
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create company"}
          </button>
        </form>
      </div>
    </div>
  );
}
