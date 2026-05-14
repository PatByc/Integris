"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "System", href: "/settings/system" },
  { label: "Account", href: "/settings/account" },
  { label: "Organization profile", href: "/settings/organization" },
  { label: "API Credentials", href: "/settings/api-page" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="w-48 flex-shrink-0">
      <ul className="space-y-0.5">
        {TABS.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === tab.href
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
