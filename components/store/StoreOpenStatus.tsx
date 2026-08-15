"use client";

import { useEffect, useState } from "react";

type BusinessHour = {
  weekday: number;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

type StoreOpenStatusProps = {
  businessHours: BusinessHour[];
};

const storeTimeZone = "America/Sao_Paulo";
const weekdayIndexes: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
const weekdayLabels = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

function timeToMinutes(value: string | null) {
  if (!value) {
    return null;
  }

  const [hour, minute] = value.split(":").map(Number);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function getStoreClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: storeTimeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    weekday: weekdayIndexes[values.weekday] ?? 0,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

function getHour(
  businessHours: BusinessHour[],
  weekday: number
) {
  return businessHours.find((hour) => hour.weekday === weekday);
}

function getOpenStatus(
  businessHours: BusinessHour[],
  date: Date
) {
  const { weekday, minutes } = getStoreClock(date);
  const today = getHour(businessHours, weekday);
  const previousWeekday = (weekday + 6) % 7;
  const previous = getHour(businessHours, previousWeekday);
  const todayOpen = timeToMinutes(today?.opensAt ?? null);
  const todayClose = timeToMinutes(today?.closesAt ?? null);
  const previousOpen = timeToMinutes(previous?.opensAt ?? null);
  const previousClose = timeToMinutes(previous?.closesAt ?? null);

  if (
    previous?.isOpen &&
    previousOpen !== null &&
    previousClose !== null &&
    previousClose <= previousOpen &&
    minutes < previousClose
  ) {
    return {
      isOpen: true,
      detail: `Fecha hoje às ${previous?.closesAt?.slice(0, 5)}`,
    };
  }

  if (
    today?.isOpen &&
    todayOpen !== null &&
    todayClose !== null &&
    (todayClose > todayOpen
      ? minutes >= todayOpen && minutes < todayClose
      : minutes >= todayOpen)
  ) {
    return {
      isOpen: true,
      detail: `Fecha ${
        todayClose <= todayOpen ? "amanhã" : "hoje"
      } às ${today.closesAt?.slice(0, 5)}`,
    };
  }

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidateWeekday = (weekday + offset) % 7;
    const candidate = getHour(businessHours, candidateWeekday);
    const candidateOpen = timeToMinutes(candidate?.opensAt ?? null);

    if (!candidate?.isOpen || candidateOpen === null) {
      continue;
    }

    if (offset === 0 && minutes >= candidateOpen) {
      continue;
    }

    const dayLabel =
      offset === 0
        ? "hoje"
        : offset === 1
          ? "amanhã"
          : weekdayLabels[candidateWeekday];

    return {
      isOpen: false,
      detail: `Abre ${dayLabel} às ${candidate.opensAt?.slice(0, 5)}`,
    };
  }

  return {
    isOpen: false,
    detail: "Horários sob consulta",
  };
}

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

  const status = getOpenStatus(businessHours, now);

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
