"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import logo from "@/logo.png";
import { createClient } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const POLL_MS = 30_000;

interface NotificationItem {
  event_type: string;
  label: string;
  document_id: string | null;
  document_filename: string | null;
  created_at: string;
  is_unread: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  member: "Member",
  viewer: "Viewer",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("pl-PL");
}

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [role, setRole] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "");
  const bellRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync input when URL q param changes externally (e.g. browser back/forward)
  useEffect(() => {
    setInputValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const t = session.access_token;
      tokenRef.current = t;
      setToken(t);

      const user = session.user;
      const name =
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split("@")[0] ||
        "User";
      setUserName(name);

      try {
        const res = await fetch(`${API_URL}/api/v1/companies/me`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.ok) {
          const data = (await res.json()) as { role?: string };
          setRole(data.role ?? "");
        }
      } catch {}
    }
    init();
  }, []);

  const fetchNotifications = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        unread_count: number;
        items: NotificationItem[];
      };
      setUnreadCount(data.unread_count);
      setNotifications(data.items);
    } catch {}
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(id);
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (!bellOpen) return;
    function handle(e: MouseEvent) {
      if (!bellRef.current?.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [bellOpen]);

  async function handleBellClick() {
    if (bellOpen) {
      setBellOpen(false);
      return;
    }
    setBellOpen(true);
    const t = tokenRef.current;
    if (unreadCount > 0 && t) {
      try {
        await fetch(`${API_URL}/api/v1/notifications/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
        });
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_unread: false })));
      } catch {}
    }
  }

  function handleSearchChange(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const target = pathname === "/dashboard" ? pathname : "/dashboard";
      const params = new URLSearchParams(
        pathname === "/dashboard" ? searchParams.toString() : ""
      );
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      // Reset to page 0 on new search
      params.delete("page");
      router.replace(`${target}?${params.toString()}`);
    }, 400);
  }

  const initials = userName.charAt(0).toUpperCase();

  return (
    <header className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center gap-4">
        <Link href="/dashboard" className="flex-shrink-0">
          <Image src={logo} alt="Integris" height={56} className="h-14 w-auto" />
        </Link>

        <div className="flex flex-1 items-center">
          <div className="relative w-full max-w-md">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search invoices, files or contractors..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            {inputValue && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div ref={bellRef} className="relative">
            <button
              onClick={handleBellClick}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
                <p className="border-b border-gray-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Notifications
                </p>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">
                    All caught up
                  </p>
                ) : (
                  <ul className="max-h-72 overflow-y-auto">
                    {notifications.slice(0, 10).map((n, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 ${n.is_unread ? "bg-blue-50/40" : ""}`}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${n.is_unread ? "bg-blue-500" : "bg-gray-300"}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-800">
                            {n.label}
                          </p>
                          {n.document_filename && (
                            <p className="truncate text-xs text-gray-500">
                              {n.document_filename}
                            </p>
                          )}
                        </div>
                        <span className="flex-shrink-0 text-xs text-gray-400">
                          {relativeTime(n.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {userName && (
            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <p className="text-sm font-medium leading-tight text-gray-800">
                  {userName}
                </p>
                {role && (
                  <p className="text-xs leading-tight text-gray-400">
                    {ROLE_LABELS[role] ?? role}
                  </p>
                )}
              </div>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {initials}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
