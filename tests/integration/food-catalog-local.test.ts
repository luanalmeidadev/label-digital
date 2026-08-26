import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { priceConfiguredCatalogItem } from "@/lib/food-catalog/pricing";
import { createFoodCatalogProductRepository } from "@/lib/food-catalog/repository";
import { CatalogPricingError } from "@/lib/food-catalog/types";

const localSupabaseUrl = process.env.LOCAL_SUPABASE_URL;
const localServiceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
const runLocalIntegration = Boolean(
  localSupabaseUrl && localServiceRoleKey
);
const testSupabaseUrl =
  localSupabaseUrl ?? "http://127.0.0.1:54321";
const testServiceRoleKey =
  localServiceRoleKey ?? "local-integration-disabled";

const ids = {
  simpleProduct: "40000000-0000-4000-8000-000000000001",
  burger: "40000000-0000-4000-8000-000000000002",
  traditionalVariant: "40000000-0000-4000-8000-000000000003",
  unavailableVariant: "40000000-0000-4000-8000-000000000004",
  pointGroup: "40000000-0000-4000-8000-000000000005",
  additionsGroup: "40000000-0000-4000-8000-000000000006",
  mediumPoint: "40000000-0000-4000-8000-000000000007",
  cheddar: "40000000-0000-4000-8000-000000000008",
  bacon: "40000000-0000-4000-8000-000000000009",
  egg: "40000000-0000-4000-8000-000000000010",
  unavailableOption: "40000000-0000-4000-8000-000000000011",
};

const testSuite = runLocalIntegration ? describe : describe.skip;

testSuite("food catalog no Supabase local", () => {
  const supabase = createClient(
    testSupabaseUrl,
    testServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  const repository = createFoodCatalogProductRepository(supabase);

  beforeAll(async () => {
    const cleanup = await supabase
      .from("products")
      .delete()
      .in("id", [ids.simpleProduct, ids.burger]);
    expect(cleanup.error).toBeNull();

    const simpleProduct = await supabase.from("products").insert({
      id: ids.simpleProduct,
      name: "Produto simples local",
      price: 18.55,
    });
    expect(simpleProduct.error).toBeNull();

    const configurableProduct = await supabase.from("products").insert({
      id: ids.burger,
      name: "X-Bacon",
      price: 0,
      pricing_mode: "variant",
    });
    expect(configurableProduct.error).toBeNull();

    const variants = await supabase.from("product_variants").insert([
      {
        id: ids.traditionalVariant,
        product_id: ids.burger,
        name: "Tradicional",
        price: 20,
        available: true,
        sort_order: 0,
      },
      {
        id: ids.unavailableVariant,
        product_id: ids.burger,
        name: "Grande indisponível",
        price: 26,
        available: false,
        sort_order: 1,
      },
    ]);
    expect(variants.error).toBeNull();

    const groups = await supabase.from("product_option_groups").insert([
      {
        id: ids.pointGroup,
        product_id: ids.burger,
        name: "Ponto da carne",
        selection_mode: "single",
        min_selections: 1,
        max_selections: 1,
        presentation_mode: "choice",
        sort_order: 0,
      },
      {
        id: ids.additionsGroup,
        product_id: ids.burger,
        name: "Adicionais",
        selection_mode: "multiple",
        min_selections: 0,
        max_selections: 2,
        presentation_mode: "addition",
        sort_order: 1,
      },
    ]);
    expect(groups.error).toBeNull();

    const options = await supabase.from("product_options").insert([
      {
        id: ids.mediumPoint,
        option_group_id: ids.pointGroup,
        name: "Ao ponto",
        price_delta: 0,
        available: true,
        sort_order: 0,
      },
      {
        id: ids.cheddar,
        option_group_id: ids.additionsGroup,
        name: "Cheddar",
        price_delta: 4,
        available: true,
        sort_order: 0,
      },
      {
        id: ids.bacon,
        option_group_id: ids.additionsGroup,
        name: "Bacon",
        price_delta: 5,
        available: true,
        sort_order: 1,
      },
      {
        id: ids.egg,
        option_group_id: ids.additionsGroup,
        name: "Ovo",
        price_delta: 2,
        available: true,
        sort_order: 2,
      },
      {
        id: ids.unavailableOption,
        option_group_id: ids.additionsGroup,
        name: "Cebola crispy indisponível",
        price_delta: 3,
        available: false,
        sort_order: 3,
      },
    ]);
    expect(options.error).toBeNull();
  });

  afterAll(async () => {
    await supabase
      .from("products")
      .delete()
      .in("id", [ids.simpleProduct, ids.burger]);
  });

  async function expectCode(
    operation: Promise<unknown>,
    code: CatalogPricingError["code"]
  ) {
    await expect(operation).rejects.toMatchObject({ code });
  }

  it("precifica produto simples diretamente de products.price", async () => {
    const result = await priceConfiguredCatalogItem(repository, {
      productId: ids.simpleProduct,
      quantity: 2,
    });

    expect(result).toMatchObject({
      baseUnitPrice: 18.55,
      optionsUnitPrice: 0,
      unitPrice: 18.55,
      itemTotal: 37.1,
    });
  });

  it("reconstroi variante e adicionais pagos usando o banco", async () => {
    const result = await priceConfiguredCatalogItem(repository, {
      productId: ids.burger,
      variantId: ids.traditionalVariant,
      optionIds: [ids.mediumPoint, ids.cheddar, ids.bacon],
      quantity: 2,
    });

    expect(result).toMatchObject({
      baseUnitPrice: 20,
      optionsUnitPrice: 9,
      unitPrice: 29,
      itemTotal: 58,
    });
  });

  it("rejeita grupo obrigatorio ausente e maximo excedido", async () => {
    await expectCode(
      priceConfiguredCatalogItem(repository, {
        productId: ids.burger,
        variantId: ids.traditionalVariant,
        quantity: 1,
      }),
      "GROUP_SELECTION_REQUIRED"
    );

    await expectCode(
      priceConfiguredCatalogItem(repository, {
        productId: ids.burger,
        variantId: ids.traditionalVariant,
        optionIds: [ids.mediumPoint, ids.cheddar, ids.bacon, ids.egg],
        quantity: 1,
      }),
      "GROUP_SELECTION_LIMIT"
    );
  });

  it("rejeita opcao e variante indisponiveis", async () => {
    await expectCode(
      priceConfiguredCatalogItem(repository, {
        productId: ids.burger,
        variantId: ids.traditionalVariant,
        optionIds: [ids.mediumPoint, ids.unavailableOption],
        quantity: 1,
      }),
      "OPTION_UNAVAILABLE"
    );

    await expectCode(
      priceConfiguredCatalogItem(repository, {
        productId: ids.burger,
        variantId: ids.unavailableVariant,
        optionIds: [ids.mediumPoint],
        quantity: 1,
      }),
      "VARIANT_UNAVAILABLE"
    );
  });

  it("rejeita identificador malformado ou ausente no banco", async () => {
    await expectCode(
      priceConfiguredCatalogItem(repository, {
        productId: "id-invalido",
        quantity: 1,
      }),
      "INVALID_IDENTIFIER"
    );

    await expectCode(
      priceConfiguredCatalogItem(repository, {
        productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        quantity: 1,
      }),
      "PRODUCT_NOT_FOUND"
    );
  });
});
