"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function OrderTrackingRefresh() {
  const router = useRouter();
  const [isPending, startTransition] =
    useTransition();

  useEffect(() => {
    function refresh() {
      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    }

    const interval = window.setInterval(
      refresh,
      15000
    );

    document.addEventListener(
      "visibilitychange",
      refresh
    );

    return () => {
      window.clearInterval(interval);
      document.removeEventListener(
        "visibilitychange",
        refresh
      );
    };
  }, [router]);

  return (
    <div
      className="flex items-center justify-center gap-2 text-xs font-semibold text-[#756A66]"
      aria-live="polite"
    >
      <RefreshCw
        size={13}
        className={
          isPending ? "animate-spin" : ""
        }
      />
      {isPending
        ? "Atualizando status..."
        : "Status atualizado automaticamente"}
    </div>
  );
}

