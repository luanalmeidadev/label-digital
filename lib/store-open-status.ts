export type StoreBusinessHour = {
  weekday: number;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

export type StoreOpenStatus = {
  isOpen: boolean;
  detail: string;
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
  businessHours: StoreBusinessHour[],
  weekday: number
) {
  return businessHours.find((hour) => hour.weekday === weekday);
}

export function getStoreOpenStatus(
  businessHours: StoreBusinessHour[],
  date: Date
): StoreOpenStatus {
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
      detail: `Fecha hoje às ${previous.closesAt?.slice(0, 5)}`,
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
