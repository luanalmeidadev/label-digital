import { describe, expect, it } from "vitest";

import {
  CatalogAdminValidationError,
  parseCatalogOptionGroupInput,
  parseCatalogOptionInput,
  parseCatalogPricingMode,
  parseCatalogVariantInput,
} from "@/lib/food-catalog/admin-validation";

const productId = "40000000-0000-4000-8000-000000000001";
const groupId = "40000000-0000-4000-8000-000000000002";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("validação administrativa do food catalog", () => {
  it("mantém produto simples como modo válido", () => {
    expect(
      parseCatalogPricingMode(
        form({ product_id: productId, pricing_mode: "simple" })
      )
    ).toEqual({ productId, pricingMode: "simple" });
  });

  it("valida criação e edição de variante com preço", () => {
    expect(
      parseCatalogVariantInput(
        form({
          product_id: productId,
          name: "Grande",
          price: "29,90",
          active: "on",
          available: "on",
        })
      )
    ).toMatchObject({
      productId,
      variantId: null,
      name: "Grande",
      price: 29.9,
      active: true,
      available: true,
    });
  });

  it("aceita grupo obrigatório ou opcional com limites coerentes", () => {
    expect(
      parseCatalogOptionGroupInput(
        form({
          product_id: productId,
          name: "Ponto da carne",
          selection_mode: "single",
          min_selections: "1",
          max_selections: "1",
          presentation_mode: "choice",
          active: "on",
        })
      )
    ).toMatchObject({
      minSelections: 1,
      maxSelections: 1,
      selectionMode: "single",
    });

    expect(
      parseCatalogOptionGroupInput(
        form({
          product_id: productId,
          name: "Adicionais",
          selection_mode: "multiple",
          min_selections: "0",
          max_selections: "3",
          presentation_mode: "addition",
          active: "on",
        })
      )
    ).toMatchObject({ minSelections: 0, maxSelections: 3 });
  });

  it("valida adicional pago e disponibilidade", () => {
    expect(
      parseCatalogOptionInput(
        form({
          product_id: productId,
          option_group_id: groupId,
          name: "Cheddar",
          price_delta: "4.00",
          active: "on",
          available: "on",
        })
      )
    ).toMatchObject({
      name: "Cheddar",
      priceDelta: 4,
      active: true,
      available: true,
    });
  });

  it("rejeita IDs, preços e min/max inválidos no servidor", () => {
    expect(() =>
      parseCatalogVariantInput(
        form({ product_id: "invasor", name: "G", price: "10" })
      )
    ).toThrow(CatalogAdminValidationError);

    expect(() =>
      parseCatalogOptionInput(
        form({
          product_id: productId,
          option_group_id: groupId,
          name: "Desconto",
          price_delta: "-1",
        })
      )
    ).toThrow("Acréscimo inválido");

    expect(() =>
      parseCatalogOptionGroupInput(
        form({
          product_id: productId,
          name: "Incoerente",
          selection_mode: "multiple",
          min_selections: "3",
          max_selections: "2",
          presentation_mode: "choice",
        })
      )
    ).toThrow("máximo de escolhas");
  });
});
