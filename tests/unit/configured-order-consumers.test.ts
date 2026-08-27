import { readFile } from "node:fs/promises";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

const consumerFiles = [
  "app/admin/(dashboard)/pedidos/page.tsx",
  "app/admin/(dashboard)/pedidos/[id]/imprimir/page.tsx",
] as const;

let consumerSources: string[] = [];
let checkoutActionSource = "";
let checkoutDrawerSource = "";
let trackingSource = "";

beforeAll(async () => {
  [consumerSources, checkoutActionSource, checkoutDrawerSource, trackingSource] =
    await Promise.all([
      Promise.all(
        consumerFiles.map((file) =>
          readFile(path.resolve(process.cwd(), file), "utf8")
        )
      ),
      readFile(
        path.resolve(process.cwd(), "app/store/checkout/actions.ts"),
        "utf8"
      ),
      readFile(
        path.resolve(process.cwd(), "components/store/CheckoutDrawer.tsx"),
        "utf8"
      ),
      readFile(path.resolve(process.cwd(), "app/pedido/[id]/page.tsx"), "utf8"),
    ]);
});

describe("consumidores operacionais de itens configurados", () => {
  it.each(consumerFiles.map((file, index) => [file, index] as const))(
    "%s le snapshots completos sem consultar o catalogo",
    (_, index) => {
    const source = consumerSources[index];

    expect(source).toContain("variant_name");
    expect(source).toContain("base_unit_price");
    expect(source).toContain("options_unit_price");
    expect(source).toContain("item_notes");
    expect(source).toContain("order_item_options");
    expect(source).not.toContain("product_variants");
    expect(source).not.toContain("product_option_groups");
    expect(source).not.toContain("product_options");
    }
  );

  it("devolve ao cliente exatamente os snapshots autoritativos persistidos", () => {
    expect(checkoutActionSource).toContain("items: orderItems.map((item) => ({");
    expect(checkoutActionSource).toContain("order_item_options: item.options");
    expect(checkoutDrawerSource).toContain("buildOrderItemsWhatsAppText(");
    expect(checkoutDrawerSource).toContain("result.items");

    const messageBlock = checkoutDrawerSource.match(
      /const itemLines = buildOrderItemsWhatsAppText\([\s\S]*?\);/
    )?.[0];
    expect(messageBlock).not.toContain("item.price");
    expect(messageBlock).not.toContain("item.name");
  });

  it("mantem o rastreamento publico protegido e sem dependencia do catalogo", () => {
    expect(trackingSource).toContain("verifyOrderTrackingToken");
    expect(trackingSource).not.toContain("product_variants");
    expect(trackingSource).not.toContain("product_option_groups");
    expect(trackingSource).not.toContain("product_options");
  });
});
