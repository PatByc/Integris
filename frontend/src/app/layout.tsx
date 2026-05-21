import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import browserIcon from "@/browser icon.png";
import { CookieBanner } from "@/components/CookieBanner";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Integris — KSeF Invoice Processing",
  description: "Connect your existing ERP to KSeF without a costly platform replacement. Upload PDF invoices, review AI-extracted data, and submit compliant FA(3) XML.",
  icons: {
    icon: [{ url: browserIcon.src, type: "image/png" }],
  },
  openGraph: {
    title: "Integris — KSeF Invoice Processing",
    description: "Connect your existing ERP to KSeF without a costly platform replacement. Upload PDF invoices, review AI-extracted data, and submit compliant FA(3) XML.",
    type: "website",
    locale: "pl_PL",
    siteName: "Integris",
    url: "https://integris.app",
  },
  twitter: {
    card: "summary",
    title: "Integris — KSeF Invoice Processing",
    description: "Connect your existing ERP to KSeF without a costly platform replacement.",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="scroll-smooth">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          {children}
          <CookieBanner />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
