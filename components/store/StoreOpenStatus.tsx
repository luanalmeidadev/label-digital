"use client";

import { useEffect, useState } from "react";
import {
  getStoreOpenStatus,
  type StoreBusinessHour,
} from "@/lib/store-open-status";

type StoreOpenStatusProps = {
  businessHours: StoreBusinessHour[];
};

export default function StoreOpenStatus({
  businessHours,
}: StoreOpenStatusProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    const initialTimer = window.setTimeout(updateClock, 0);
    const interval = window.setInterval(updateClock, 30_000);

    document.addEventListener("visibilitychange", updateClock);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, []);

  if (!now) {
    return (
      <div className="flex min-h-20 items-center gap-4 rounded-2xl bg-white/10 px-5 py-4 text-white/75 ring-1 ring-inset ring-white/10">
        <span className="h-3 w-3 rounded-full bg-white/50" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
            Atendimento agora
          </p>
          <p className="mt-1 text-sm font-bold">Verificando horário...</p>
        </div>
      </div>
    );
  }

  const status = getStoreOpenStatus(businessHours, now);

  return (
    <div
      aria-live="polite"
      className={`flex min-h-20 flex-col gap-3 rounded-2xl px-5 py-4 shadow-lg ring-1 ring-inset sm:flex-row sm:items-center sm:justify-between ${
        status.isOpen
          ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
          : "bg-[#FFF7F5] text-[#8B0000] ring-[#E8D2C1]"
      }`}
    >
      <div className="flex items-center gap-4">
        <span
          className={`h-3.5 w-3.5 shrink-0 rounded-full ring-4 ${
            status.isOpen
              ? "animate-pulse bg-emerald-500 ring-emerald-200"
              : "bg-[#8B0000] ring-[#F0DAD5]"
          }`}
        />

        <div>
          <p
            className={`text-[11px] font-bold uppercase tracking-[0.16em] ${
              status.isOpen ? "text-emerald-700" : "text-[#8B0000]/65"
            }`}
          >
            Atendimento agora
          </p>
          <p className="mt-0.5 text-lg font-extrabold sm:text-xl">
            {status.isOpen ? "Loja aberta" : "Loja fechada"}
          </p>
        </div>
      </div>

      <p
        className={`rounded-full px-3 py-1.5 text-xs font-bold sm:text-sm ${
          status.isOpen
            ? "bg-emerald-100 text-emerald-800"
            : "bg-[#F0DAD5] text-[#8B0000]"
        }`}
      >
        {status.detail}
      </p>
    </div>
  );
}
