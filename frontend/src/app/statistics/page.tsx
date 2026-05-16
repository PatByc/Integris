import { AppHeader } from "@/components/AppHeader";
import { Sidebar } from "@/components/Sidebar";

export default function StatisticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <Sidebar />

      <main className="ml-64 pt-24 px-8 pb-8">
        <div className="max-w-screen-xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Statistics</h1>
          <p className="mt-1 text-sm text-gray-500">Analytics and reporting</p>

          <div className="mt-12 flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-[64px] text-gray-200 mb-4">bar_chart</span>
            <p className="text-lg font-semibold text-gray-400">To be done post-MVP</p>
            <p className="mt-1 text-sm text-gray-400">Charts, trends, and reporting will be available here.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
