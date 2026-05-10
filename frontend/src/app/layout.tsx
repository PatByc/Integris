import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import browserIcon from "@/browser icon.png";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Integris — KSeF Invoice Processing",
  description: "Convert PDF invoices to KSeF-compliant FA(3) XML",
  icons: {
    icon: [{ url: browserIcon.src, type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
