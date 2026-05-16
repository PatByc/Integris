"use client";

import { useTranslations } from "next-intl";

interface ValidationError {
  id: string;
  rule_name: string;
  field_path: string | null;
  message: string;
}

interface Props {
  errors: ValidationError[];
}

export function ValidationErrors({ errors }: Props) {
  const t = useTranslations("Review");

  if (errors.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm font-medium text-green-700">{t("noValidationErrors")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <p className="mb-2 text-sm font-medium text-red-700">
        {t("validationErrors", { count: errors.length })}
      </p>
      <ul className="space-y-1">
        {errors.map((e) => (
          <li key={e.id} className="text-sm text-red-600">
            <span className="font-mono text-xs font-semibold">{e.field_path ?? e.rule_name}</span>
            {" — "}
            {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
