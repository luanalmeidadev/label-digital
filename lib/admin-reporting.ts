export const reportPeriodLabels = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  month: "Este mês",
  all: "Todos",
} as const;

export type ReportPeriod = keyof typeof reportPeriodLabels;

type ReportSearchParams = {
  period?: string;
  from?: string;
  to?: string;
};

export type ResolvedReportPeriod = {
  selectedPeriod: ReportPeriod | "custom";
  label: string;
  from: string;
  to: string;
  startIso: string | null;
  endExclusiveIso: string | null;
  validationError: string | null;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function saoPauloDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isValidDate(value: string) {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function shiftDate(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

function boundaryIso(value: string) {
  // O Brasil não adota horário de verão desde 2019. 00:00 em São Paulo = 03:00 UTC.
  return `${value}T03:00:00.000Z`;
}

function customPeriod(from: string, to: string): ResolvedReportPeriod | null {
  if (!isValidDate(from) || !isValidDate(to) || from > to) return null;

  return {
    selectedPeriod: "custom",
    label: `${formatDate(from)} a ${formatDate(to)}`,
    from,
    to,
    startIso: boundaryIso(from),
    endExclusiveIso: boundaryIso(shiftDate(to, 1)),
    validationError: null,
  };
}

export function resolveReportPeriod(
  params: ReportSearchParams,
  now = new Date()
): ResolvedReportPeriod {
  const today = saoPauloDate(now);

  if (params.period === "custom") {
    const resolved = customPeriod(params.from ?? "", params.to ?? "");
    if (resolved) return resolved;
  }

  const selectedPeriod =
    params.period && params.period in reportPeriodLabels
      ? (params.period as ReportPeriod)
      : "30d";

  if (selectedPeriod === "all") {
    return {
      selectedPeriod,
      label: reportPeriodLabels[selectedPeriod],
      from: "",
      to: "",
      startIso: null,
      endExclusiveIso: null,
      validationError:
        params.period === "custom"
          ? "Informe um período válido, com a data inicial anterior à data final."
          : null,
    };
  }

  const from =
    selectedPeriod === "today"
      ? today
      : selectedPeriod === "month"
        ? `${today.slice(0, 8)}01`
        : shiftDate(today, selectedPeriod === "7d" ? -6 : -29);

  return {
    selectedPeriod,
    label: reportPeriodLabels[selectedPeriod],
    from,
    to: today,
    startIso: boundaryIso(from),
    endExclusiveIso: boundaryIso(shiftDate(today, 1)),
    validationError:
      params.period === "custom"
        ? "Informe um período válido, com a data inicial anterior à data final."
        : null,
  };
}

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildReportCsv(rows: Array<Array<string | number>>) {
  return rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
