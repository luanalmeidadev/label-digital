import { describe, expect, it } from "vitest";

import { buildReportCsv, resolveReportPeriod } from "@/lib/admin-reporting";

describe("períodos dos relatórios", () => {
  const now = new Date("2026-08-25T12:00:00.000Z");

  it("usa o dia comercial de São Paulo", () => {
    expect(resolveReportPeriod({ period: "today" }, now)).toMatchObject({
      from: "2026-08-25",
      to: "2026-08-25",
      startIso: "2026-08-25T03:00:00.000Z",
      endExclusiveIso: "2026-08-26T03:00:00.000Z",
    });
  });

  it("calcula sete dias incluindo a data atual", () => {
    expect(resolveReportPeriod({ period: "7d" }, now)).toMatchObject({
      from: "2026-08-19",
      to: "2026-08-25",
    });
  });

  it("aceita intervalo personalizado inclusivo", () => {
    expect(
      resolveReportPeriod(
        { period: "custom", from: "2026-08-01", to: "2026-08-10" },
        now
      )
    ).toMatchObject({
      selectedPeriod: "custom",
      startIso: "2026-08-01T03:00:00.000Z",
      endExclusiveIso: "2026-08-11T03:00:00.000Z",
      validationError: null,
    });
  });

  it("recusa intervalo personalizado invertido", () => {
    expect(
      resolveReportPeriod(
        { period: "custom", from: "2026-08-10", to: "2026-08-01" },
        now
      ).validationError
    ).toBeTruthy();
  });
});

describe("exportação de relatórios", () => {
  it("gera CSV compatível com planilhas e neutraliza fórmulas", () => {
    expect(buildReportCsv([["Produto", "Valor"], ["=PERIGO", 12.5]])).toBe(
      '"Produto";"Valor"\r\n"\'=PERIGO";"12.5"'
    );
  });
});
