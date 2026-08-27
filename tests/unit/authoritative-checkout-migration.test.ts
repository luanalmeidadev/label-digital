import { readFile } from "node:fs/promises";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260828100000_authoritative_configured_checkout.sql"
);

let sql = "";

beforeAll(async () => {
  sql = (await readFile(migrationPath, "utf8")).toLowerCase();
});

describe("checkout autoritativo e atômico", () => {
  it("versiona alterações relevantes do produto e de seus filhos", () => {
    expect(sql).toContain("add column catalog_version bigint not null default 1");
    expect(sql).toContain("products_bump_catalog_version");
    expect(sql).toContain("product_variants_touch_catalog_version");
    expect(sql).toContain("product_option_groups_touch_catalog_version");
    expect(sql).toContain("product_options_touch_catalog_version");
  });

  it("cria pedido, itens e opções dentro de uma única função", () => {
    expect(sql).toContain("function public.create_online_order_atomic");
    expect(sql).toContain("insert into public.orders");
    expect(sql).toContain("insert into public.order_items");
    expect(sql).toContain("insert into public.order_item_options");
    expect(sql).toContain("for share");
  });

  it("recalcula o subtotal a partir dos snapshots validados", () => {
    expect(sql).toContain(
      "computed_subtotal := computed_subtotal + (item_unit_price * item_quantity)"
    );
    expect(sql).toContain("computed_total := computed_subtotal + p_delivery_fee");
    expect(sql).not.toContain("p_subtotal");
    expect(sql).not.toContain("p_total");
  });

  it("impede chamada pública e permite somente service role", () => {
    expect(sql).toMatch(
      /revoke all on function public\.create_online_order_atomic\([\s\S]+?from public, anon, authenticated;/
    );
    expect(sql).toMatch(
      /grant execute on function public\.create_online_order_atomic\([\s\S]+?to service_role;/
    );
  });

  it("é aditiva e não executa operações destrutivas", () => {
    expect(sql).not.toMatch(/\bdrop\s+table\b/);
    expect(sql).not.toMatch(/\bdrop\s+column\b/);
    expect(sql).not.toMatch(/\btruncate\b/);
    expect(sql).not.toMatch(/\bdelete\s+from\b/);
  });
});
