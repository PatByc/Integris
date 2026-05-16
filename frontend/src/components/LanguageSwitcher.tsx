"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Settings");

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    document.cookie = `NEXT_LOCALE=${e.target.value}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <select
      value={locale}
      onChange={handleChange}
      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      <option value="pl">{t("polish")}</option>
      <option value="en">{t("english")}</option>
    </select>
  );
}
