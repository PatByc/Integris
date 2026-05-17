"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Nav");

  const NAV_ITEMS = [
    {
      key: "dashboard",
      label: t("dashboard"),
      href: "/dashboard",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      key: "statistics",
      label: t("statistics"),
      href: "/statistics",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      key: "validation",
      label: t("validation"),
      href: "/validation",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4" />
        </svg>
      ),
    },
    {
      key: "ksefSubmission",
      label: t("ksefSubmission"),
      href: "/ksef",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
    },
    {
      key: "archive",
      label: t("archive"),
      href: "/archive",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="group fixed left-0 top-20 z-40 flex h-[calc(100vh-5rem)] w-14 flex-col overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-out hover:w-56">
      <nav className="flex flex-1 flex-col py-2">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href !== "#" &&
            (pathname === item.href || pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150 ${
                active
                  ? "border-r-2 border-blue-600 bg-blue-50 text-blue-700"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              {item.icon}
              <span className="whitespace-nowrap opacity-0 transition-opacity duration-100 delay-100 group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-2">
        <button
          onClick={() => router.push("/upload")}
          className="flex w-full items-center gap-3 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all"
        >
          <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="whitespace-nowrap opacity-0 transition-opacity duration-100 delay-100 group-hover:opacity-100">
            {t("newExtraction")}
          </span>
        </button>
      </div>
    </aside>
  );
}
