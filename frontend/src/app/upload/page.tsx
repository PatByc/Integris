import Link from "next/link";
import { UploadZone } from "@/components/UploadZone";

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-2xl">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-2 text-xl font-semibold">Upload invoice</h1>
        <p className="mb-8 text-sm text-gray-600">
          Upload a PDF invoice to begin processing.
        </p>
        <UploadZone />
      </main>
    </div>
  );
}
