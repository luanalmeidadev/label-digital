"use client";

import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase/client";

const tabSessionKey = "label-admin-tab-session";

export default function AdminTabSessionBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionStarted =
      url.searchParams.get("session") === "started";
    const tabSessionActive =
      window.sessionStorage.getItem(tabSessionKey) ===
      "active";

    if (sessionStarted) {
      window.sessionStorage.setItem(
        tabSessionKey,
        "active"
      );
      url.searchParams.delete("session");
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
      const readyTimer = window.setTimeout(
        () => setReady(true),
        0
      );
      return () => window.clearTimeout(readyTimer);
    }

    if (tabSessionActive) {
      const readyTimer = window.setTimeout(
        () => setReady(true),
        0
      );
      return () => window.clearTimeout(readyTimer);
    }

    void supabase.auth.signOut().finally(() => {
      window.location.replace(
        "/admin/login?status=session-ended"
      );
    });
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFDF9] px-5">
        <div
          role="status"
          className="rounded-2xl border border-[#EEE6DF] bg-white px-6 py-5 text-center shadow-sm"
        >
          <p className="font-bold text-[#241B19]">
            Verificando sua sessão...
          </p>
          <p className="mt-1 text-xs text-[#756A66]">
            Aguarde um instante.
          </p>
        </div>
      </main>
    );
  }

  return children;
}
