import { readFile } from "node:fs/promises";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

let actionSource = "";
let drawerSource = "";

beforeAll(async () => {
  [actionSource, drawerSource] = await Promise.all([
    readFile(
      path.resolve(process.cwd(), "app/store/checkout/actions.ts"),
      "utf8"
    ),
    readFile(
      path.resolve(process.cwd(), "components/store/CheckoutDrawer.tsx"),
      "utf8"
    ),
  ]);
});

describe("integração autoritativa do checkout", () => {
  it("envia identificadores e configuração, sem enviar preços do carrinho", () => {
    const payloadMatch = drawerSource.match(
      /items:\s*items\.map\(\s*\(item\)\s*=>\s*\(\{[\s\S]*?quantity:\s*item\.quantity,[\s\S]*?\}\)\s*\)/
    );
    expect(payloadMatch).not.toBeNull();
    const payload = payloadMatch?.[0] ?? "";

    expect(payload).toContain("productId:");
    expect(payload).toContain("catalogVersion:");
    expect(payload).toContain("variantId:");
    expect(payload).toContain("optionIds:");
    expect(payload).toContain("itemNotes:");
    expect(payload).toContain("quantity:");
    expect(payload).not.toContain("item.price");
    expect(payload).not.toContain("subtotal");
    expect(payload).not.toContain("total:");
  });

  it("reconstrói preço no servidor e usa uma única RPC transacional", () => {
    expect(actionSource).toContain("priceConfiguredCatalogItem");
    expect(actionSource).toContain("buildPersistableOrderItemSnapshot");
    expect(actionSource).toContain('.rpc("create_online_order_atomic"');
    expect(actionSource).not.toContain('.from("orders")\n      .insert');
    expect(actionSource).not.toContain('.from("order_items")\n      .insert');
  });

  it("solicita revisão do carrinho quando o catálogo mudou", () => {
    expect(actionSource).toContain('code: "CATALOG_REVIEW_REQUIRED"');
    expect(drawerSource).toContain(
      'result.code === "CATALOG_REVIEW_REQUIRED"'
    );
    expect(drawerSource).toContain("router.refresh()");
  });

  it("usa o snapshot autoritativo na mensagem depois da persistencia", () => {
    expect(actionSource).toContain("items: orderItems.map((item) => ({");
    expect(actionSource).toContain("order_item_options: item.options");
    expect(drawerSource).toContain("buildOrderItemsWhatsAppText(");
    expect(drawerSource).toContain("result.items");
  });
});
