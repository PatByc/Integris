"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useTranslations } from "next-intl";

// Spritesheet: 1152×768px, 6 cols × 4 rows = 24 frames, each 192×192px
const COLS = 6;
const TOTAL_FRAMES = 24;
const DISPLAY = 42; // display size in px
const SCALE = DISPLAY / 192;
const BG_W = Math.round(1152 * SCALE); // 168
const BG_H = Math.round(768 * SCALE);  // 112

function SpriteLoader() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % TOTAL_FRAMES), 84);
    return () => clearInterval(id);
  }, []);

  const col = frame % COLS;
  const row = Math.floor(frame / COLS);

  return (
    <span
      style={{
        display: "inline-block",
        width: DISPLAY,
        height: DISPLAY,
        backgroundImage: "url(/loading-sprite.png)",
        backgroundSize: `${BG_W}px ${BG_H}px`,
        backgroundPosition: `${-col * DISPLAY}px ${-row * DISPLAY}px`,
        backgroundRepeat: "no-repeat",
        flexShrink: 0,
      }}
    />
  );
}

export default function LoginPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">{t("signInTitle")}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t("email")}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t("password")}
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 items-center justify-center gap-2 overflow-hidden rounded bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <SpriteLoader />
              <span>{t("signingIn")}</span>
            </>
          ) : (
            t("signIn")
          )}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-blue-600 hover:underline">
          {t("register")}
        </Link>
      </p>
    </>
  );
}
