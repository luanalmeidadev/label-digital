import { readFile } from "node:fs/promises";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

let reportsSource = "";
let billingSource = "";
let cashActionsSource = "";
let cashControlsSource = "";
let cashPrintSource = "";
let migrationSql = "";

beforeAll(async () => {
  [
    reportsSource,
    billingSource,
    cashActionsSource,
    cashControlsSource,
    cashPrintSource,
    migrationSql,
  ] = await Promise.all([
    readFile(
      path.resolve(process.cwd(), "app/admin/(dashboard)/relatorios/page.tsx"),
      "utf8"
    ),
    readFile(
      path.resolve(process.cwd(), "app/admin/(dashboard)/faturamento/page.tsx"),
      "utf8"
    ),
    readFile(
      path.resolve(process.cwd(), "app/admin/(dashboard)/caixa/actions.ts"),
      "utf8"
    ),
    readFile(
      path.resolve(process.cwd(), "components/admin/CashSessionControls.tsx"),
      "utf8"
    ),
    readFile(
      path.resolve(
        process.cwd(),
        "app/admin/(dashboard)/caixa/[id]/imprimir/page.tsx"
      ),
      "utf8"
    ),
    readFile(
      path.resolve(
        process.cwd(),
        "supabase/migrations/20260830100000_configurable_product_losses.sql"
      ),
      "utf8"
    ),
  ]);
});

describe("relatórios configuráveis", () => {
  it("consulta snapshots de itens e opções sem reconstruir preços pelo catálogo", () => {
    expect(reportsSource).toContain("base_unit_price");
    expect(reportsSource).toContain("options_unit_price");
    expect(reportsSource).toContain("order_item_options (");
    expect(reportsSource).toContain("summarizeSoldOrderItems(items)");
    expect(reportsSource).not.toContain('.from("product_variants")');
    expect(reportsSource).not.toContain('.from("product_options")');
  });

  it("mantém ranking por produto e apresenta variantes e opções como análises secundárias", () => {
    expect(reportsSource).toContain("Produtos que mais saem");
    expect(reportsSource).toContain("Vendas por variante");
    expect(reportsSource).toContain("Opções mais escolhidas");
    expect(reportsSource).toContain("sem tratá-los como produtos");
  });

  it("exporta detalhamento imutável e não duplica faturamento do pedido", () => {
    expect(reportsSource).toContain('"DETALHES DOS ITENS VENDIDOS"');
    expect(reportsSource).toContain('"Preço base unitário"');
    expect(reportsSource).toContain('"Adicionais unitários"');
    expect(billingSource).toContain("sum + sale.total");
    expect(billingSource).not.toContain("order_item_options");
  });
});

describe("perdas configuráveis", () => {
  it("estende o snapshot de perda sem remover o fluxo legado", () => {
    const sql = migrationSql.toLowerCase();

    expect(sql).toContain("alter table public.product_losses");
    expect(sql).toContain("add column variant_id uuid");
    expect(sql).toContain("add column variant_name text");
    expect(sql).toContain("on delete set null");
    expect(sql).toContain("function public.create_configured_product_loss");
    expect(sql).not.toContain("drop function public.create_product_loss");
    expect(sql).not.toMatch(/\bdrop\s+table\b/);
    expect(sql).not.toMatch(/\btruncate\b/);
    expect(sql).not.toMatch(/\bdelete\s+from\b/);
  });

  it("recalcula o valor e preserva nomes no servidor autenticado", () => {
    const sql = migrationSql.toLowerCase();

    expect(sql).toContain("public.has_admin_permission('cashier')");
    expect(sql).toContain("selected_unit_price := selected_variant.price");
    expect(sql).toContain("selected_unit_price := selected_product.price");
    expect(sql).toContain("selected_product.name");
    expect(sql).toContain("selected_variant_name");
    expect(sql).toContain("estimated_value");
  });

  it("permite escolher variante sem expor IDs técnicos no histórico", () => {
    expect(cashActionsSource).toContain('"create_configured_product_loss"');
    expect(cashControlsSource).toContain('name="variant_id"');
    expect(cashControlsSource).toContain("Variante: {loss.variantName}");
    expect(cashPrintSource).toContain("loss.variant_name");
  });
});
