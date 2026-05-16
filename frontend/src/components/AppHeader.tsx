"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import logo from "@/logo.png";
import { createClient } from "@/lib/supabase";
import { useTranslations } from "next-intl";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function relativeTime(iso: string, t: (key: string, values?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return t("justNow");
  const m = Math.floor(s / 60);
  if (m < 60) return t("minutesAgo", { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("hoursAgo", { h });
  return new Date(iso).toLocaleDateString("pl-PL");
}

export function AppHeader() {
  const t = useTranslations("Nav");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [planType, setPlanType] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "");
  const bellRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      const tok = session.access_token;
      tokenRef.current = tok;
      setToken(tok);

      const user = session.user;
      const name =
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split("@")[0] ||
        "User";
      setUserName(name);
      setUserEmail(user.email ?? "");

      try {
        const res = await fetch(`${API_URL}/api/v1/companies/me`, {
          headers: { Authorization: `Bearer ${tok}` },
        });
        if (res.ok) {
          const data = (await res.json()) as {
            role?: string;
            company?: { name?: string; plan_type?: string };
          };
          setRole(data.role ?? "");
          setCompanyName(data.company?.name ?? "");
          setPlanType(data.company?.plan_type ?? "testing");
        }
      } catch {}
    }
    init();
  }, []);

  const fetchNotifications = useCallback(async () => {
    const tok = tokenRef.current;
    if (!tok) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications`, {
        headers: { Authorization: `Bearer ${tok}` },
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

  useEffect(() => {
    if (!avatarOpen) return;
    function handle(e: MouseEvent) {
      if (!avatarRef.current?.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [avatarOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleBellClick() {
    if (bellOpen) {
      setBellOpen(false);
      return;
    }
    setBellOpen(true);
    const tok = tokenRef.current;
    if (unreadCount > 0 && tok) {
      try {
        await fetch(`${API_URL}/api/v1/notifications/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${tok}` },
        });
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_unread: false })));
      } catch {}
    }
  }

  function parseSearchDate(value: string): { date_from: string; date_to: string } | null {
    const v = value.trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { date_from: v, date_to: v };
    // YYYY-MM
    const ym = v.match(/^(\d{4})-(\d{2})$/);
    if (ym) {
      const last = new Date(parseInt(ym[1]), parseInt(ym[2]), 0).getDate();
      return { date_from: `${ym[1]}-${ym[2]}-01`, date_to: `${ym[1]}-${ym[2]}-${String(last).padStart(2, "0")}` };
    }
    // MM/YYYY
    const my = v.match(/^(\d{2})\/(\d{4})$/);
    if (my) {
      const last = new Date(parseInt(my[2]), parseInt(my[1]), 0).getDate();
      return { date_from: `${my[2]}-${my[1]}-01`, date_to: `${my[2]}-${my[1]}-${String(last).padStart(2, "0")}` };
    }
    // DD.MM.YYYY
    const dmy = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dmy) {
      const iso = `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
      return { date_from: iso, date_to: iso };
    }
    return null;
  }

  function handleSearchChange(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const target = pathname === "/dashboard" ? pathname : "/dashboard";
      const params = new URLSearchParams(
        pathname === "/dashboard" ? searchParams.toString() : ""
      );
      const parsed = value ? parseSearchDate(value) : null;
      if (parsed) {
        params.delete("q");
        params.set("date_from", parsed.date_from);
        params.set("date_to", parsed.date_to);
      } else if (value) {
        params.set("q", value);
        params.delete("date_from");
        params.delete("date_to");
      } else {
        params.delete("q");
        params.delete("date_from");
        params.delete("date_to");
      }
      params.delete("page");
      router.replace(`${target}?${params.toString()}`);
    }, 400);
  }

  function roleLabel(r: string): string {
    if (r === "admin") return t("roleAdmin");
    if (r === "member") return t("roleMember");
    if (r === "viewer") return t("roleViewer");
    return r;
  }

  const initials = userName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
  const companyInitial = (companyName || "W").charAt(0).toUpperCase();

  // Cast t to the simpler signature for relativeTime
  const tSimple = t as (key: string, values?: Record<string, unknown>) => string;

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-3">
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
              placeholder={t("searchPlaceholder")}
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
          {/* Bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={handleBellClick}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
                <p className="border-b border-gray-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t("notifications")}
                </p>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">{t("allCaughtUp")}</p>
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
                          <p className="truncate font-medium text-gray-800">{n.label}</p>
                          {n.document_filename && (
                            <p className="truncate text-xs text-gray-500">{n.document_filename}</p>
                          )}
                        </div>
                        <span className="flex-shrink-0 text-xs text-gray-400">
                          {relativeTime(n.created_at, tSimple)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Avatar */}
          {userName && (
            <div className="flex items-center pl-4 border-l border-gray-200">
            <div ref={avatarRef} className="relative">
              <button
                onClick={() => setAvatarOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 transition-all hover:bg-gray-100"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {initials}
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium text-gray-900">{userName}</span>
                  {planType && (
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                      planType === "starter" ? "text-amber-600" :
                      planType === "growth" ? "text-blue-600" :
                      planType === "enterprise" ? "text-purple-600" :
                      "text-gray-400"
                    }`}>{planType}</span>
                  )}
                </div>
              </button>

              {avatarOpen && (
                /*
                 * overflow-hidden is intentionally omitted here so that the
                 * workspace and help flyouts (positioned right-full) are not
                 * clipped by the dropdown's box boundary.
                 */
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">

                  {/* ── Workspace row — flyout on hover ── */}
                  <div className="group relative">
                    <div className="flex cursor-default items-center rounded-t-xl px-4 py-3 hover:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {companyName || "Workspace"}
                        </p>
                        <p className="mt-0.5 text-xs capitalize text-gray-400">
                          {roleLabel(role)}{planType ? ` · ${planType}` : ""}
                        </p>
                      </div>
                      <svg className="ml-2 h-3.5 w-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>

                    {/* Workspace flyout */}
                    <div className="invisible absolute left-full top-0 z-50 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg group-hover:visible">
                      {/* Email */}
                      <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-3">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                          <svg className="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="truncate text-xs text-gray-500">{userEmail}</span>
                      </div>

                      <div className="py-1">
                        {/* Active workspace */}
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                            {companyInitial}
                          </div>
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                            {companyName || "Workspace"}
                          </p>
                          <svg className="h-4 w-4 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>

                        {/* Current user */}
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                            {initials}
                          </div>
                          <p className="truncate text-sm text-gray-700">{userName}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* ── Settings & Help ── */}
                  <div className="py-1">
                    {planType && planType !== "enterprise" && (
                      <button
                        onClick={() => { setAvatarOpen(false); router.push("/pricing"); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        {t("upgradePlan")}
                      </button>
                    )}
                    <button
                      onClick={() => { setAvatarOpen(false); router.push("/settings"); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {t("settings")}
                    </button>

                    {/* Help row — flyout on hover */}
                    <div className="group relative">
                      <div className="flex w-full cursor-default items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <span className="flex items-center gap-2.5">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t("help")}
                        </span>
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>

                      {/* Help flyout */}
                      <div className="invisible absolute left-full top-0 z-50 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg group-hover:visible">
                        <div className="py-1">
                          <button
                            onClick={() => { setAvatarOpen(false); router.push("/help"); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {t("helpCenter")}
                          </button>
                          <button
                            onClick={() => setAvatarOpen(false)}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 013 8V5a2 2 0 012-2z" />
                            </svg>
                            {t("releaseNotes")}
                          </button>
                        </div>

                        <div className="border-t border-gray-100" />

                        <div className="py-1">
                          <button
                            onClick={() => { setAvatarOpen(false); router.push("/terms"); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {t("termsOfService")}
                          </button>
                          <button
                            onClick={() => { setAvatarOpen(false); router.push("/privacy"); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {t("privacyPolicy")}
                          </button>
                          <button
                            onClick={() => { setAvatarOpen(false); window.location.href = "mailto:support@integris.pl"; }}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {t("reportBug")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* ── Security & Governance ── */}
                  <div className="py-1">
                    <button
                      onClick={() => { setAvatarOpen(false); router.push("/security"); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Security &amp; Governance
                    </button>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* ── Log out ── */}
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-b-xl px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {t("logOut")}
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
