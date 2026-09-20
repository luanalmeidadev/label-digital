import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const testSupabaseUrl = process.env.LOCAL_SUPABASE_URL ?? "http://127.0.0.1:55321";
const testServiceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("Contrato de Invariantes de Instalação (Fresh Install Contract)", () => {
  const supabase = createClient(testSupabaseUrl, testServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  it("garante a existência dos buckets de storage obrigatórios da infraestrutura", async () => {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    expect(error).toBeNull();
    const bucketNames = buckets?.map((b) => b.name) ?? [];

    expect(bucketNames).toContain("product-images");
    expect(bucketNames).toContain("preorder-catalog");
  });

  it("garante que os 7 dias da semana (0..6) existem na tabela business_hours", async () => {
    const { data: hours, error } = await supabase
      .from("business_hours")
      .select("weekday, is_open")
      .order("weekday");

    expect(error).toBeNull();
    expect(hours).toHaveLength(7);
    const weekdays = hours?.map((h) => h.weekday);
    expect(weekdays).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("garante que o registro singleton de store_settings possui todas as colunas de suporte à UI", async () => {
    const { data: settings, error } = await supabase
      .from("store_settings")
      .select("id, store_name, whatsapp, instagram, pickup_enabled, delivery_enabled, address_street, address_number, address_city, address_state")
      .limit(1)
      .maybeSingle();

    expect(error).toBeNull();
    expect(settings).not.toBeNull();
    expect(settings?.store_name).toBeDefined();
    expect(settings?.pickup_enabled).toBeDefined();
    expect(settings?.delivery_enabled).toBeDefined();
  });

  it("garante que perfis administrativos com nome nulo não quebram a ordenação de contas", () => {
    const accounts = [
      { id: "1", name: "", email: "b@test.com", role: "admin" as const, permissions: [], emailConfirmed: true, createdAt: "" },
      { id: "2", name: "Alice", email: "a@test.com", role: "admin" as const, permissions: [], emailConfirmed: true, createdAt: "" },
      { id: "3", name: "", email: "c@test.com", role: "admin" as const, permissions: [], emailConfirmed: true, createdAt: "" },
    ];

    expect(() => {
      accounts.sort((first, second) => {
        const nameA = first.name || first.email || "";
        const nameB = second.name || second.email || "";
        return nameA.localeCompare(nameB, "pt-BR");
      });
    }).not.toThrow();

    expect(accounts[0].name).toBe("Alice");
    expect(accounts[1].email).toBe("b@test.com");
    expect(accounts[2].email).toBe("c@test.com");
  });

  it("garante que tabelas de dados de negócio opcionais (delivery_zones, coupons, promotional_events) suportam 0 registros sem erro de banco", async () => {
    const [zones, coupons, events, products, categories] = await Promise.all([
      supabase.from("delivery_zones").select("id"),
      supabase.from("coupons").select("id"),
      supabase.from("promotional_events").select("id"),
      supabase.from("products").select("id"),
      supabase.from("categories").select("id"),
    ]);

    expect(zones.error).toBeNull();
    expect(coupons.error).toBeNull();
    expect(events.error).toBeNull();
    expect(products.error).toBeNull();
    expect(categories.error).toBeNull();
  });
});
