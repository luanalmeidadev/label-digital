import { readFile } from "node:fs/promises";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260827100000_food_catalog_foundation.sql"
);

let sql = "";

beforeAll(async () => {
  sql = (await readFile(migrationPath, "utf8")).toLowerCase();
});

describe("migration aditiva do catálogo food service", () => {
  it("cria as quatro tabelas aprovadas", () => {
    for (const table of [
      "product_variants",
      "product_option_groups",
      "product_options",
      "order_item_options",
    ]) {
      expect(sql).toContain(`create table public.${table}`);
    }
  });

  it("mantém products.price e adiciona modo simples por padrão", () => {
    expect(sql).toContain(
      "add column pricing_mode text not null default 'simple'"
    );
    expect(sql).not.toMatch(/drop\s+column\s+(?:if\s+exists\s+)?price/);
    expect(sql).not.toMatch(/alter\s+column\s+price\s+drop\s+not\s+null/);
  });

  it("adiciona snapshots sem tornar o fluxo legado obrigatório", () => {
    expect(sql).toContain("add column variant_id uuid");
    expect(sql).toContain("add column base_unit_price numeric(10,2)");
    expect(sql).toContain(
      "add column options_unit_price numeric(10,2) not null default 0"
    );
    expect(sql).not.toMatch(/base_unit_price\s+numeric\(10,2\)\s+not\s+null/);
  });

  it("preserva tabelas e colunas antigas", () => {
    expect(sql).not.toMatch(/\bdrop\s+table\b/);
    expect(sql).not.toMatch(/\bdrop\s+column\b/);
    expect(sql).not.toMatch(/\btruncate\b/);
    expect(sql).not.toMatch(/\bdelete\s+from\b/);
  });

  it("protege preços, limites, FKs, índices e exclusões históricas", () => {
    expect(sql).toContain("check (price >= 0::numeric)");
    expect(sql).toContain("min_selections between 0 and 50");
    expect(sql).toContain("on delete cascade");
    expect(sql).toContain("on delete set null");
    expect(sql).toContain("order_item_options_order_item_sort_idx");
  });

  it("habilita RLS sem conceder escrita pública", () => {
    for (const table of [
      "product_variants",
      "product_option_groups",
      "product_options",
      "order_item_options",
    ]) {
      expect(sql).toContain(
        `alter table public.${table} enable row level security`
      );
    }

    expect(sql).toContain("public.has_admin_permission('catalog')");
    expect(sql).not.toMatch(/grant\s+(?:all|insert|update|delete)[^;]*\s+to\s+anon/);
    expect(sql).not.toMatch(/grant\s+insert[^;]*\s+to\s+anon/);
  });
});

