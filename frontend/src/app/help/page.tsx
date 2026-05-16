import { Suspense } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { getTranslations } from "next-intl/server";

export default async function HelpPage() {
  const t = await getTranslations("Help");

  const STEPS = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
    { title: t("step4Title"), body: t("step4Body") },
    { title: t("step5Title"), body: t("step5Body") },
  ];

  const FAQS = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense>
        <AppHeader />
      </Suspense>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
            {t("backToDashboard")}
          </Link>
        </div>

        <h1 className="mb-8 text-xl font-semibold text-gray-900">{t("title")}</h1>

        {/* Workflow */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            {t("howItWorks")}
          </h2>
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-5">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            {t("faq")}
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm font-semibold text-gray-900">{faq.q}</p>
                <p className="mt-1 text-sm text-gray-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            {t("contact")}
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">
              {t("contactText")}{" "}
              <a
                href="mailto:support@integris.pl"
                className="font-medium text-blue-600 hover:underline"
              >
                support@integris.pl
              </a>
              .
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
