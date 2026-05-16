"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import logo from "@/logo.png";

const LINKS = [
  { href: "/pricing",  key: "pricing"  },
  { href: "/about",    key: "about"    },
  { href: "/security", key: "security" },
] as const;

export function LandingNav() {
  const pathname = usePathname();
  const t = useTranslations("LandingNav");

  return (
    <nav className="relative flex items-center justify-between border-b border-gray-100 px-8 py-3">
      <Link href="/" className="flex-shrink-0">
        <Image src={logo} alt="Integris" height={48} className="h-12 w-auto" />
      </Link>

      {/* Absolutely centered so links stay mid-screen regardless of logo width */}
      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-8">
        {LINKS.map(({ href, key }) => (
          <Link
            key={href}
            href={href}
            className={`text-base font-medium transition-colors ${
              pathname === href
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t(key)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
