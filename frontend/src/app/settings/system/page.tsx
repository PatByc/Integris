export default function SystemPage() {
  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Interface
        </h2>
        <dl className="space-y-4">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Language</dt>
            <dd className="text-sm font-medium text-gray-900">Polish (pl-PL)</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Date format</dt>
            <dd className="text-sm font-medium text-gray-900">DD.MM.YYYY</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Currency</dt>
            <dd className="text-sm font-medium text-gray-900">PLN (Polish Złoty)</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Timezone</dt>
            <dd className="text-sm font-medium text-gray-900">Europe/Warsaw</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          KSeF integration
        </h2>
        <dl className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <dt className="text-sm text-gray-500">Submission environment</dt>
              <p className="mt-0.5 text-xs text-gray-400">
                Controlled via{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 font-mono">KSEF_ENV</code>{" "}
                server environment variable
              </p>
            </div>
            <dd>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                dry_run
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Schema version</dt>
            <dd className="text-sm font-medium text-gray-900">FA(3)</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">AI extraction model</dt>
            <dd className="text-sm font-medium text-gray-900">gpt-4.1-mini</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          About
        </h2>
        <dl className="space-y-4">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Product</dt>
            <dd className="text-sm font-medium text-gray-900">Integris</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500">Version</dt>
            <dd className="text-sm font-medium text-gray-900">MVP 1.0</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
