"use client";

import Image from "next/image";
import { useState } from "react";
import openAILogo from "@/openAI_logo.png";
import anthropicLogo from "@/anthropic_logo.png";
import geminiLogo from "@/gemini_logo.jpg";
import { useTranslations } from "next-intl";

type Mode = "integris" | "external";
type AIProvider = "openai" | "anthropic" | "gemini";

const PROVIDER_LOGOS = {
  openai:    { src: openAILogo,    bg: "bg-white border border-gray-200" },
  anthropic: { src: anthropicLogo, bg: "bg-[#F5E6E0]"                   },
  gemini:    { src: geminiLogo,    bg: "bg-blue-50"                      },
} as const;

const AI_PROVIDERS: Array<{ id: AIProvider; name: string; shortName: string }> = [
  { id: "openai",    name: "OpenAI",        shortName: "OpenAI"  },
  { id: "anthropic", name: "Anthropic",      shortName: "Anthropic" },
  { id: "gemini",    name: "Google Gemini",  shortName: "Gemini"  },
];

const AI_MODELS: Record<AIProvider, Array<{ id: string; label: string }>> = {
  openai: [
    { id: "gpt-4.1-mini", label: "GPT-4.1 mini — Recommended" },
    { id: "gpt-4.1",      label: "GPT-4.1 — Most capable" },
    { id: "gpt-4.1-nano", label: "GPT-4.1 nano — Fastest" },
    { id: "gpt-4o",       label: "GPT-4o" },
    { id: "gpt-4o-mini",  label: "GPT-4o mini" },
    { id: "o4-mini",      label: "o4-mini — Reasoning" },
    { id: "o3",           label: "o3 — Advanced reasoning" },
  ],
  anthropic: [
    { id: "claude-opus-4-7",   label: "Claude Opus 4 — Most capable" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4 — Balanced" },
    { id: "claude-haiku-4-5",  label: "Claude Haiku 4 — Fast" },
  ],
  gemini: [
    { id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro — Most capable" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash — Balanced" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash — Fast" },
  ],
};

const KEY_PLACEHOLDER: Record<AIProvider, string> = {
  openai:    "sk-…",
  anthropic: "sk-ant-…",
  gemini:    "AIza…",
};

function ProviderLogo({ id, size = 20 }: { id: AIProvider; size?: number }) {
  const { src, bg } = PROVIDER_LOGOS[id];
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded ${bg}`}
      style={{ width: size, height: size }}
    >
      <Image src={src} alt={id} width={size} height={size} className="object-contain" />
    </div>
  );
}

function ModeToggle({ value, onChange }: { value: Mode; onChange: (v: Mode) => void }) {
  const t = useTranslations("Settings");
  return (
    <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {(["integris", "external"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-all ${
            value === m
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {m === "integris" ? t("integrisMode") : t("externalMode")}
        </button>
      ))}
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function KeyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-10 font-mono text-sm text-gray-900 placeholder:text-gray-300 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {visible ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default function ApiCredentialsPage() {
  const t = useTranslations("Settings");
  const [aiMode, setAiMode] = useState<Mode>("integris");
  const [aiProvider, setAiProvider] = useState<AIProvider>("openai");
  const [aiModel, setAiModel] = useState("gpt-4.1-mini");
  const [aiKey, setAiKey] = useState("");

  const [ocrMode, setOcrMode] = useState<Mode>("integris");
  const [ocrKey, setOcrKey] = useState("");

  function handleAiModeChange(mode: Mode) {
    setAiMode(mode);
    setAiModel(mode === "integris" ? "gpt-4.1-mini" : AI_MODELS[aiProvider][0].id);
  }

  function handleAiProviderChange(p: AIProvider) {
    setAiProvider(p);
    setAiModel(AI_MODELS[p][0].id);
  }

  const modelsForCurrentContext = aiMode === "integris" ? AI_MODELS.openai : AI_MODELS[aiProvider];

  const ksefLabels = [
    { label: t("clientNip"),   env: "KSEF_CLIENT_NIP" },
    { label: t("authToken"),   env: "KSEF_CLIENT_SECRET" },
    { label: t("mfPublicKey"), env: "KSEF_PUBLIC_KEY_PEM" },
  ];

  return (
    <>
      {/* ── AI Provider ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t("aiProvider")}</h2>
            <p className="mt-0.5 text-xs text-gray-400">{t("aiProviderDesc")}</p>
          </div>
          <ModeToggle value={aiMode} onChange={handleAiModeChange} />
        </div>

        {aiMode === "integris" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t("provider")}</span>
              <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-400">
                <ProviderLogo id="openai" size={20} />
                OpenAI
                <LockIcon />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-500">{t("model")}</span>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                {AI_MODELS.openai.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-600">
              {t("apiKeyManagedByIntegris")}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">{t("provider")}</p>
              <div className="grid grid-cols-3 gap-2">
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleAiProviderChange(p.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      aiProvider === p.id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <ProviderLogo id={p.id} size={20} />
                    <span className="truncate">{p.shortName}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-500">{t("model")}</span>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                {modelsForCurrentContext.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-1.5 text-sm text-gray-500">API Key</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <KeyInput value={aiKey} onChange={setAiKey} placeholder={KEY_PLACEHOLDER[aiProvider]} />
                </div>
                <button
                  disabled={!aiKey.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("save")}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── OCR Provider ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t("ocrProvider")}</h2>
            <p className="mt-0.5 text-xs text-gray-400">{t("ocrProviderDesc")}</p>
          </div>
          <ModeToggle value={ocrMode} onChange={setOcrMode} />
        </div>

        {ocrMode === "integris" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t("provider")}</span>
              <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-400">
                <ProviderLogo id="gemini" size={20} />
                Google Cloud Vision
                <LockIcon />
              </div>
            </div>
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-600">
              {t("apiKeyManagedByIntegris")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t("provider")}</span>
              <div className="flex items-center gap-2 rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                <ProviderLogo id="gemini" size={20} />
                Google Cloud Vision
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm text-gray-500">Service account key <span className="text-gray-400">(JSON)</span></p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <KeyInput value={ocrKey} onChange={setOcrKey} placeholder='{"type":"service_account","project_id":"…"}' />
                </div>
                <button
                  disabled={!ocrKey.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("save")}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── KSeF Credentials ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">{t("ksefCredentials")}</h2>
        <p className="mb-4 text-xs text-gray-400">
          {t("ksefCredentialsDesc")}
        </p>
        <dl className="space-y-4">
          {ksefLabels.map(({ label, env }) => (
            <div key={env} className="flex items-center justify-between">
              <div>
                <dt className="text-sm text-gray-500">{label}</dt>
                <p className="mt-0.5 text-xs text-gray-400">
                  <code className="rounded bg-gray-100 px-1 py-0.5 font-mono">{env}</code>
                </p>
              </div>
              <dd>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                  {t("envManaged")}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Integris API Key ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{t("integrisApiKey")}</h2>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
            {t("comingSoon")}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          {t("integrisApiKeyDesc")}
        </p>
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3">
          <svg className="h-4 w-4 flex-shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <span className="font-mono text-sm text-gray-300">sk_live_••••••••••••••••••••••••</span>
          <button disabled className="ml-auto cursor-not-allowed rounded px-2 py-0.5 text-xs text-gray-300">
            Copy
          </button>
        </div>
      </section>
    </>
  );
}
