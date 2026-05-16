"use client";

import { useTranslations } from "next-intl";

export interface LineItem {
  id?: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price_net: string;
  vat_rate: string;
  net_amount: string;
  vat_amount: string;
  gross_amount: string;
  sort_order: number;
}

interface Props {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

const EMPTY_ITEM: LineItem = {
  description: "",
  quantity: "",
  unit: "",
  unit_price_net: "",
  vat_rate: "",
  net_amount: "",
  vat_amount: "",
  gross_amount: "",
  sort_order: 0,
};

export function LineItemsTable({ items, onChange }: Props) {
  const t = useTranslations("Review");

  const COLS: { key: keyof LineItem; label: string; width: string }[] = [
    { key: "description",   label: t("description"),  width: "w-40" },
    { key: "quantity",      label: t("qty"),          width: "w-16" },
    { key: "unit",          label: t("unit"),         width: "w-16" },
    { key: "unit_price_net",label: t("unitPriceNet"), width: "w-28" },
    { key: "vat_rate",      label: t("vatPct"),       width: "w-16" },
    { key: "net_amount",    label: t("net"),          width: "w-24" },
    { key: "vat_amount",    label: t("vat"),          width: "w-24" },
    { key: "gross_amount",  label: t("gross"),        width: "w-24" },
  ];

  function update(index: number, key: keyof LineItem, value: string) {
    const next = items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    onChange(next);
  }

  function addRow() {
    onChange([...items, { ...EMPTY_ITEM, sort_order: items.length }]);
  }

  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {COLS.map((col) => (
                <th key={col.key} className={`px-2 py-2 text-left font-medium text-gray-500 ${col.width}`}>
                  {col.label}
                </th>
              ))}
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <tr key={i}>
                {COLS.map((col) => (
                  <td key={col.key} className="px-1 py-1">
                    <input
                      type="text"
                      value={String(item[col.key] ?? "")}
                      onChange={(e) => update(i, col.key, e.target.value)}
                      className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:border-blue-400 focus:outline-none"
                    />
                  </td>
                ))}
                <td className="px-1 py-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-red-400 hover:text-red-600"
                    title={t("removeRow")}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="text-xs text-blue-600 hover:underline"
      >
        {t("addLineItem")}
      </button>
    </div>
  );
}
