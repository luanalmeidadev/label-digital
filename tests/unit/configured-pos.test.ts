import { readFile } from "node:fs/promises";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

let actionSource = "";
let posSource = "";
let migrationSql = "";

beforeAll(async () => {
  [actionSource, posSource, migrationSql] = await Promise.all([
    readFile(
      path.resolve(process.cwd(), "app/admin/(dashboard)/caixa/actions.ts"),
      "utf8"
    ),
    readFile(
      path.resolve(process.cwd(), "components/admin/CashRegisterPOS.tsx"),
      "utf8"
    ),
    readFile(
      path.resolve(
        process.cwd(),
        "supabase/migrations/20260829100000_configured_cashier_sale.sql"
      ),
      "utf8"
    ),
  ]);
});

describe("POS com catálogo configurável", () => {
  it("mantém clique direto para simples e abre configurador somente quando necessário", () => {
    expect(posSource).toContain("isConfigurableProduct(product.configuration)");
    expect(posSource).toContain("<CashierProductConfiguratorDialog");
    expect(posSource).toContain("addSimpleProduct(product)");
  });

  it("identifica linhas pela configuração completa", () => {
    expect(posSource).toContain("mergeCartItem(current, item)");
    expect(posSource).toContain("key={item.lineKey}");
    expect(posSource).toContain("changeQuantity(item.lineKey");
  });

  it("envia somente identificadores e escolhas para a Server Action", () => {
    const payload = posSource.match(
      /items:\s*cart\.map\(\(item\)\s*=>\s*\(\{[\s\S]*?quantity:\s*item\.quantity,[\s\S]*?\}\)\)/
    )?.[0];

    expect(payload).toContain("productId: item.id");
    expect(payload).toContain("catalogVersion: item.catalogVersion");
    expect(payload).toContain("variantId:");
    expect(payload).toContain("optionIds:");
    expect(payload).toContain("itemNotes:");
    expect(payload).not.toContain("price:");
    expect(payload).not.toContain("total:");
  });

  it("reprecifica no servidor antes da RPC transacional", () => {
    expect(actionSource).toContain("priceConfiguredCatalogItem");
    expect(actionSource).toContain("buildPersistableOrderItemSnapshot");
    expect(actionSource).toContain('.rpc(\n    "create_configured_cashier_sale"');
    expect(actionSource).toContain('code: "CATALOG_REVIEW_REQUIRED"');
  });

  it("persiste venda, snapshots, opções e pagamentos atomicamente", () => {
    const sql = migrationSql.toLowerCase();

    expect(sql).toContain("function public.create_configured_cashier_sale");
    expect(sql).toContain("insert into public.orders");
    expect(sql).toContain("insert into public.order_items");
    expect(sql).toContain("insert into public.order_item_options");
    expect(sql).toContain("insert into public.order_payments");
    expect(sql).toContain("invalid_group_selection");
    expect(sql).toContain("payment_total_mismatch");
    expect(sql).toContain("for share");
  });

  it("preserva a RPC antiga e não contém operação destrutiva", () => {
    const sql = migrationSql.toLowerCase();

    expect(sql).not.toContain("drop function public.create_cashier_sale");
    expect(sql).not.toMatch(/\bdrop\s+table\b/);
    expect(sql).not.toMatch(/\btruncate\b/);
    expect(sql).not.toMatch(/\bdelete\s+from\b/);
  });

  it("protege a escrita com autenticação e permissão de caixa", () => {
    const sql = migrationSql.toLowerCase();

    expect(sql).toContain("public.has_admin_permission('cashier')");
    expect(sql).toMatch(
      /revoke all on function public\.create_configured_cashier_sale\([\s\S]+?from public, anon;/
    );
    expect(sql).toMatch(
      /grant execute on function public\.create_configured_cashier_sale\([\s\S]+?to authenticated;/
    );
  });
});
