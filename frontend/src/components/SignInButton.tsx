"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const COLS = 6;
const TOTAL_FRAMES = 24;
const DISPLAY = 42;
const SCALE = DISPLAY / 192;
const BG_W = Math.round(1152 * SCALE);
const BG_H = Math.round(768 * SCALE);

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

interface Props {
  className: string;
  label: string;
  loadingLabel?: string;
}

export function SignInButton({ className, label, loadingLabel = "Signing in…" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleClick() {
    setLoading(true);
    router.push("/login");
  }

  return (
    <button onClick={handleClick} disabled={loading} className={`${className} overflow-hidden`}>
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <SpriteLoader />
          <span>{loadingLabel}</span>
        </span>
      ) : (
        label
      )}
    </button>
  );
}
