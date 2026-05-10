"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { PdfPreview } from "@/components/review/PdfPreview";
import { InvoiceForm } from "@/components/review/InvoiceForm";
import { ValidationErrors } from "@/components/review/ValidationErrors";
import { ApproveButton } from "@/components/review/ApproveButton";

interface InvoiceDraftOut {
  id: string;
  document_id: string;
  seller_name: string | null;
  seller_nip: string | null;
  seller_address: string | null;
  buyer_name: string | null;
  buyer_nip: string | null;
  buyer_address: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  sale_date: string | null;
  payment_due_date: string | null;
  payment_method: string | null;
  currency: string | null;
  net_total: string | null;
  vat_total: string | null;
  gross_total: string | null;
  line_items: {
    id: string;
    description: string | null;
    quantity: string | null;
    unit: string | null;
    unit_price_net: string | null;
    vat_rate: string | null;
    net_amount: string | null;
    vat_amount: string | null;
    gross_amount: string | null;
    sort_order: number;
  }[];
}

interface ValidationErrorOut {
  id: string;
  rule_name: string;
  field_path: string | null;
  message: string;
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [draft, setDraft] = useState<InvoiceDraftOut | null>(null);
  const [errors, setErrors] = useState<ValidationErrorOut[]>([]);
  const [role, setRole] = useState<string>("viewer");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [draftData, errorsData, companyData] = await Promise.all([
          apiGet<InvoiceDraftOut>(`/api/v1/documents/${id}/draft`),
          apiGet<ValidationErrorOut[]>(`/api/v1/documents/${id}/validation-errors`),
          apiGet<{ role: string }>(`/api/v1/companies/me`),
        ]);
        setDraft(draftData);
        setErrors(errorsData);
        setRole(companyData.role);
      } catch {
        setLoadError("Failed to load document data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function handleSaved(updatedDraft: InvoiceDraftOut, updatedErrors: ValidationErrorOut[]) {
    setDraft(updatedDraft);
    setErrors(updatedErrors);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (loadError || !draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-red-600">{loadError ?? "Document not found."}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Review invoice</h1>
            <p className="text-xs text-gray-400 font-mono">{id}</p>
          </div>
          <Link href="/review" className="text-sm text-blue-600 hover:underline">
            ← Review queue
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-6 py-6">
        {/* Left: PDF */}
        <div className="flex-1 min-h-[600px]">
          <PdfPreview documentId={id} />
        </div>

        {/* Right: form + errors + approve */}
        <div className="w-[480px] flex-shrink-0 space-y-4 overflow-y-auto">
          <ValidationErrors errors={errors} />

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <InvoiceForm
              documentId={id}
              initialDraft={draft}
              onSaved={handleSaved}
            />
          </div>

          <ApproveButton
            documentId={id}
            role={role}
            hasErrors={errors.length > 0}
          />
        </div>
      </main>
    </div>
  );
}
