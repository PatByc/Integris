"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function CookieBanner() {
  const t = useTranslations("CookieBanner");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const has = document.cookie.split("; ").some((c) => c.startsWith("cookie_consent="));
    if (!has) setVisible(true);
  }, []);

  function accept() {
    document.cookie = "cookie_consent=accepted; path=/; max-age=31536000";
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-6 py-4 shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          {t("text")}{" "}
          <Link href="/privacy" className="underline hover:text-gray-900">
            {t("privacyLink")}
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="flex-shrink-0 rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
