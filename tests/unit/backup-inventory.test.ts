import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  applicationTables,
  getStorageBuckets,
} from "../../scripts/backup-inventory.mjs";
import {
  demoBurgerInstallationModules,
  labelInstallationModules,
} from "../../config/installation/module-presets.mjs";

type TableEvent = {
  index: number;
  operation: "create" | "drop" | "rename";
  table: string;
  renamedTable?: string;
};

function readTableEvents(sql: string) {
  const events: TableEvent[] = [];
  const createOrDropPattern =
    /\b(create\s+table(?:\s+if\s+not\s+exists)?|drop\s+table(?:\s+if\s+exists)?)\s+public\."?([a-z_][a-z0-9_]*)"?/gi;
  const renamePattern =
    /\balter\s+table(?:\s+if\s+exists)?\s+public\."?([a-z_][a-z0-9_]*)"?\s+rename\s+to\s+"?([a-z_][a-z0-9_]*)"?/gi;

  for (const match of sql.matchAll(createOrDropPattern)) {
    events.push({
      index: match.index,
      operation: match[1].toLowerCase().startsWith("create")
        ? "create"
        : "drop",
      table: match[2],
    });
  }

  for (const match of sql.matchAll(renamePattern)) {
    events.push({
      index: match.index,
      operation: "rename",
      table: match[1],
      renamedTable: match[2],
    });
  }

  return events.sort((left, right) => left.index - right.index);
}

async function getCurrentPublicTables() {
  const migrationsDirectory = path.resolve(
    process.cwd(),
    "supabase",
    "migrations"
  );
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const tables = new Set<string>();

  for (const migrationFile of migrationFiles) {
    const sql = await readFile(
      path.join(migrationsDirectory, migrationFile),
      "utf8"
    );

    for (const event of readTableEvents(sql)) {
      if (event.operation === "create") {
        tables.add(event.table);
      } else if (event.operation === "drop") {
        tables.delete(event.table);
      } else if (event.renamedTable) {
        tables.delete(event.table);
        tables.add(event.renamedTable);
      }
    }
  }

  return [...tables].sort();
}

describe("inventário do backup operacional", () => {
  it("inclui todas as tabelas públicas atuais das migrations", async () => {
    expect([...applicationTables].sort()).toEqual(
      await getCurrentPublicTables()
    );
  });

  it("inclui as tabelas financeiras, de caixa e auditoria", () => {
    expect(applicationTables).toEqual(
      expect.arrayContaining([
        "cash_sessions",
        "order_payments",
        "cash_movements",
        "order_refunds",
        "product_losses",
        "admin_audit_logs",
      ])
    );
  });

  it("inclui o catálogo configurável e seus snapshots", () => {
    expect(applicationTables).toEqual(
      expect.arrayContaining([
        "product_variants",
        "product_option_groups",
        "product_options",
        "order_item_options",
      ])
    );
  });

  it("não possui fontes duplicadas e cobre os Storages atuais", () => {
    const storageBuckets = getStorageBuckets(labelInstallationModules);
    expect(new Set(applicationTables).size).toBe(
      applicationTables.length
    );
    expect(new Set(storageBuckets).size).toBe(
      storageBuckets.length
    );
    expect(storageBuckets).toEqual([
      "product-images",
      "preorder-catalog",
    ]);
  });

  it("não exige o Storage de encomendas quando o módulo está desligado", () => {
    expect(getStorageBuckets(demoBurgerInstallationModules)).toEqual([
      "product-images",
    ]);
  });
});
