import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { AppHeader } from "@/components/AppHeader";
import { Sidebar } from "@/components/Sidebar";
import { SettingsNav } from "@/components/SettingsNav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense>
        <AppHeader />
      </Suspense>
      <Suspense>
        <Sidebar />
      </Suspense>

      <div className="pl-20">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <div className="mb-6">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
              ← Back to dashboard
            </Link>
          </div>

          <h1 className="mb-8 text-xl font-semibold text-gray-900">Settings</h1>

          <div className="flex gap-8">
            <Suspense>
              <SettingsNav />
            </Suspense>
            <div className="min-w-0 flex-1 space-y-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
