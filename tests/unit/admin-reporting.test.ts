import { describe, expect, it } from "vitest";

import {
  buildReportCsv,
  resolveReportPeriod,
  summarizeSoldOrderItems,
} from "@/lib/admin-reporting";

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

describe("relatórios do catálogo configurável", () => {
  const configuredItems = [
    {
      id: "item-configured",
      product_id: "product-x-bacon",
      product_name: "X-Bacon histórico",
      variant_id: "variant-large",
      variant_name: "Grande histórico",
      quantity: 2,
      base_unit_price: 28,
      options_unit_price: 9,
      unit_price: 37,
      item_notes: "sem cebola",
      order_item_options: [
        {
          id: "snapshot-point",
          option_id: "option-point",
          group_name: "Ponto da carne",
          option_name: "Ao ponto",
          presentation_mode: "choice",
          price_delta: 0,
          group_sort_order: 0,
          option_sort_order: 0,
        },
        {
          id: "snapshot-cheddar",
          option_id: "option-cheddar",
          group_name: "Adicionais",
          option_name: "Cheddar histórico",
          presentation_mode: "addition",
          price_delta: 4,
          group_sort_order: 1,
          option_sort_order: 0,
        },
        {
          id: "snapshot-bacon",
          option_id: "option-bacon",
          group_name: "Adicionais",
          option_name: "Bacon histórico",
          presentation_mode: "addition",
          price_delta: 5,
          group_sort_order: 1,
          option_sort_order: 1,
        },
      ],
    },
    {
      id: "item-legacy",
      product_id: "product-brownie",
      product_name: "Brownie",
      quantity: 3,
      unit_price: 12,
    },
  ];

  it("mantém produto principal como dimensão e soma adicionais uma única vez", () => {
    const report = summarizeSoldOrderItems(configuredItems);

    expect(report.products).toEqual([
      {
        key: "product-x-bacon",
        name: "X-Bacon histórico",
        quantity: 2,
        baseRevenue: 56,
        optionsRevenue: 18,
        revenue: 74,
      },
      {
        key: "product-brownie",
        name: "Brownie",
        quantity: 3,
        baseRevenue: 36,
        optionsRevenue: 0,
        revenue: 36,
      },
    ]);
  });

  it("analisa variante e opções separadamente sem tratá-las como produtos", () => {
    const report = summarizeSoldOrderItems(configuredItems);

    expect(report.products).toHaveLength(2);
    expect(report.variants).toEqual([
      expect.objectContaining({
        productName: "X-Bacon histórico",
        variantName: "Grande histórico",
        quantity: 2,
        revenue: 74,
      }),
    ]);
    expect(report.options).toEqual([
      expect.objectContaining({ optionName: "Ao ponto", selections: 2, revenue: 0 }),
      expect.objectContaining({
        optionName: "Cheddar histórico",
        selections: 2,
        revenue: 8,
      }),
      expect.objectContaining({
        optionName: "Bacon histórico",
        selections: 2,
        revenue: 10,
      }),
    ]);
  });

  it("gera detalhes para CSV somente a partir dos snapshots persistidos", () => {
    const report = summarizeSoldOrderItems(configuredItems);

    expect(report.details[0]).toEqual({
      productName: "X-Bacon histórico",
      variantName: "Grande histórico",
      optionLabels: [
        "Ponto da carne: Ao ponto",
        "+ Cheddar histórico",
        "+ Bacon histórico",
      ],
      itemNotes: "sem cebola",
      quantity: 2,
      baseUnitPrice: 28,
      optionsUnitPrice: 9,
      unitPrice: 37,
      total: 74,
    });
    expect(report.details[1]).toMatchObject({
      productName: "Brownie",
      baseUnitPrice: 12,
      optionsUnitPrice: 0,
      unitPrice: 12,
      total: 36,
    });
  });
});
