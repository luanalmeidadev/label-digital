"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";

const refreshDelay = 500;

export default function AdminRealtimeRefresh() {
  const router = useRouter();
  const refreshTimer = useRef<number | null>(null);
  const refreshWhenVisible = useRef(false);

  useEffect(() => {
    function scheduleRefresh() {
      if (document.visibilityState !== "visible") {
        refreshWhenVisible.current = true;
        return;
      }

      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }

      refreshTimer.current = window.setTimeout(() => {
        refreshTimer.current = null;
        refreshWhenVisible.current = false;
        router.refresh();
      }, refreshDelay);
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        refreshWhenVisible.current
      ) {
        scheduleRefresh();
      }
    }

    const channel = supabase
      .channel("admin-data-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
        },
        scheduleRefresh
      )
      .subscribe();

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
