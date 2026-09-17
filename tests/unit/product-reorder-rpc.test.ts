import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe("Product Reorder RPC", () => {
  it("reorders products correctly", async () => {
    // Setup: Get products for an existing category or create them
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .limit(1)
      .single();

    if (!category) return;

    // Get current products
    const { data: products } = await supabase
      .from("products")
      .select("id, sort_order")
      .eq("category_id", category.id)
      .order("sort_order");

    if (!products || products.length < 2) return;

    // Reverse their order
    const orderedIds = products.map((p) => p.id).reverse();

    const { error } = await supabase.rpc("reorder_category_products", {
      p_category_id: category.id,
      p_ordered_ids: orderedIds,
    });

    expect(error).toBeNull();

    // Verify the new sort orders
    const { data: updatedProducts } = await supabase
      .from("products")
      .select("id, sort_order")
      .eq("category_id", category.id)
      .order("sort_order");

    expect(updatedProducts).toBeDefined();

    // Sort_order should be 10, 20, 30... mapped to orderedIds
    for (let i = 0; i < orderedIds.length; i++) {
      const p = updatedProducts?.find((p) => p.id === orderedIds[i]);
      expect(p?.sort_order).toBe((i + 1) * 10);
    }
  });

  it("fails if omitting a product", async () => {
    const { data: category } = await supabase.from("categories").select("id").limit(1).single();
    if (!category) return;

    const { data: products } = await supabase.from("products").select("id").eq("category_id", category.id);
    if (!products || products.length < 2) return;

    const orderedIds = products.map((p) => p.id).slice(0, products.length - 1); // omit last

    const { error } = await supabase.rpc("reorder_category_products", {
      p_category_id: category.id,
      p_ordered_ids: orderedIds,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("Quantidade de produtos enviados difere");
  });

  it("fails if adding an extra duplicate product", async () => {
    const { data: category } = await supabase.from("categories").select("id").limit(1).single();
    if (!category) return;

    const { data: products } = await supabase.from("products").select("id").eq("category_id", category.id);
    if (!products || products.length < 2) return;

    const orderedIds = products.map((p) => p.id);
    orderedIds.push(orderedIds[0]); // Duplicate

    const { error } = await supabase.rpc("reorder_category_products", {
      p_category_id: category.id,
      p_ordered_ids: orderedIds,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("Quantidade de produtos enviados difere");
  });

  it("fails if swapping with product from another category", async () => {
    const { data: categories } = await supabase.from("categories").select("id").limit(2);
    if (!categories || categories.length < 2) return;

    const { data: products1 } = await supabase.from("products").select("id").eq("category_id", categories[0].id);
    const { data: products2 } = await supabase.from("products").select("id").eq("category_id", categories[1].id);

    if (!products1 || !products2 || products1.length < 1 || products2.length < 1) return;

    const orderedIds = products1.map((p) => p.id);
    orderedIds[0] = products2[0].id; // Replace one with foreign product

    const { error } = await supabase.rpc("reorder_category_products", {
      p_category_id: categories[0].id,
      p_ordered_ids: orderedIds,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("não pertence à categoria ou não existe");
  });
});
