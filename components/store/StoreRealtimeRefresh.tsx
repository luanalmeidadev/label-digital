"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";

const refreshDelay = 1000;

export default function StoreRealtimeRefresh() {
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
      .channel("store-menu-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "store_settings",
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_hours",
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_zones",
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
