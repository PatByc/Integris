"use client";

import { useState } from "react";
import { apiPatch, ApiError } from "@/lib/api";
import { LineItemsTable, type LineItem } from "./LineItemsTable";
import { useTranslations } from "next-intl";

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
  line_items: LineItemOut[];
}

interface LineItemOut {
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
}

interface ValidationErrorOut {
  id: string;
  rule_name: string;
  field_path: string | null;
  message: string;
}

interface Props {
  documentId: string;
  initialDraft: InvoiceDraftOut;
  onSaved: (draft: InvoiceDraftOut, errors: ValidationErrorOut[]) => void;
}

function toLineItem(li: LineItemOut): LineItem {
  return {
    id: li.id,
    description: li.description ?? "",
    quantity: li.quantity ?? "",
    unit: li.unit ?? "",
    unit_price_net: li.unit_price_net ?? "",
    vat_rate: li.vat_rate ?? "",
    net_amount: li.net_amount ?? "",
    vat_amount: li.vat_amount ?? "",
    gross_amount: li.gross_amount ?? "",
    sort_order: li.sort_order,
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
      />
    </div>
  );
}

export function InvoiceForm({ documentId, initialDraft, onSaved }: Props) {
  const t = useTranslations("Review");
  const [form, setForm] = useState({
    seller_name: initialDraft.seller_name ?? "",
    seller_nip: initialDraft.seller_nip ?? "",
    seller_address: initialDraft.seller_address ?? "",
    buyer_name: initialDraft.buyer_name ?? "",
    buyer_nip: initialDraft.buyer_nip ?? "",
    buyer_address: initialDraft.buyer_address ?? "",
    invoice_number: initialDraft.invoice_number ?? "",
    issue_date: initialDraft.issue_date ?? "",
    sale_date: initialDraft.sale_date ?? "",
    payment_due_date: initialDraft.payment_due_date ?? "",
    payment_method: initialDraft.payment_method ?? "",
    currency: initialDraft.currency ?? "PLN",
    net_total: initialDraft.net_total ?? "",
    vat_total: initialDraft.vat_total ?? "",
    gross_total: initialDraft.gross_total ?? "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialDraft.line_items.map(toLineItem)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...Object.fromEntries(
          Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
        ),
        line_items: lineItems.map((li, i) => ({
          id: li.id ?? null,
          description: li.description || null,
          quantity: li.quantity || null,
          unit: li.unit || null,
          unit_price_net: li.unit_price_net || null,
          vat_rate: li.vat_rate || null,
          net_amount: li.net_amount || null,
          vat_amount: li.vat_amount || null,
          gross_amount: li.gross_amount || null,
          sort_order: i,
        })),
      };
      const updatedDraft = await apiPatch<InvoiceDraftOut>(
        `/api/v1/documents/${documentId}/draft`,
        body
      );
      const errors = await import("@/lib/api").then(({ apiGet }) =>
        apiGet<ValidationErrorOut[]>(`/api/v1/documents/${documentId}/validation-errors`)
      );
      onSaved(updatedDraft, errors);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">{t("seller")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("name")} value={form.seller_name} onChange={set("seller_name")} />
          <Field label={t("nip")} value={form.seller_nip} onChange={set("seller_nip")} />
          <div className="col-span-2">
            <Field label={t("address")} value={form.seller_address} onChange={set("seller_address")} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">{t("buyer")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("name")} value={form.buyer_name} onChange={set("buyer_name")} />
          <Field label={t("nip")} value={form.buyer_nip} onChange={set("buyer_nip")} />
          <div className="col-span-2">
            <Field label={t("address")} value={form.buyer_address} onChange={set("buyer_address")} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">{t("invoiceDetails")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("invoiceNumber")} value={form.invoice_number} onChange={set("invoice_number")} />
          <Field label={t("currency")} value={form.currency} onChange={set("currency")} />
          <Field label={t("issueDate")} value={form.issue_date} onChange={set("issue_date")} type="date" />
          <Field label={t("saleDate")} value={form.sale_date} onChange={set("sale_date")} type="date" />
          <Field label={t("paymentDue")} value={form.payment_due_date} onChange={set("payment_due_date")} type="date" />
          <Field label={t("paymentMethod")} value={form.payment_method} onChange={set("payment_method")} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">{t("totals")}</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("netTotal")} value={form.net_total} onChange={set("net_total")} />
          <Field label={t("vatTotal")} value={form.vat_total} onChange={set("vat_total")} />
          <Field label={t("grossTotal")} value={form.gross_total} onChange={set("gross_total")} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">{t("lineItems")}</h3>
        <LineItemsTable items={lineItems} onChange={setLineItems} />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? t("saving") : t("saveChanges")}
      </button>
    </div>
  );
}
