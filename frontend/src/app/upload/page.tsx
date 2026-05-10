import { Suspense } from "react";
import Link from "next/link";
import { UploadZone } from "@/components/UploadZone";
import { AppHeader } from "@/components/AppHeader";

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense>
        <AppHeader />
      </Suspense>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
        <h1 className="mb-2 text-xl font-semibold">Upload invoice</h1>
        <p className="mb-8 text-sm text-gray-600">
          Upload a PDF invoice to begin processing.
        </p>
        <UploadZone />
      </main>
    </div>
  );
}
