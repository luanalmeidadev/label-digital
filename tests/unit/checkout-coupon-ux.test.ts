import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, beforeAll } from "vitest";

let drawerSource = "";
let sectionSource = "";

beforeAll(async () => {
  [drawerSource, sectionSource] = await Promise.all([
    readFile(path.resolve(process.cwd(), "components/store/CheckoutDrawer.tsx"), "utf8"),
    readFile(path.resolve(process.cwd(), "components/store/CheckoutCouponSection.tsx"), "utf8"),
  ]);
});

describe("UX de Cupons V1 (Arquitetura Componentizada)", () => {
  it("CheckoutDrawer deve renderizar CheckoutCouponSection SOMENTE quando há itens no carrinho", () => {
    // Verifica que o drawer condicionalmente monta a seção do cupom baseando-se no carrinho
    expect(drawerSource).toContain("items.length > 0 &&");
    expect(drawerSource).toContain("<CheckoutCouponSection");
    expect(drawerSource).toContain("onCouponResolved={setAppliedCoupon}");
  });

  it("CheckoutCouponSection deve propagar limpeza para o pai ao ser desmontada", () => {
    // Verifica que o ciclo de desmontagem (quando carrinho = 0) limpa o estado
    expect(sectionSource).toMatch(/useEffect\(\(\) => \{\s*return \(\) => \{\s*onCouponResolved\(null\);\s*\};\s*\}, \[onCouponResolved\]\);/);
  });
  it("CheckoutDrawer não deve mais possuir lógica manual de setState para carrinho vazio", () => {
    expect(drawerSource).not.toContain("if (items.length === 0 && appliedCoupon)");
    expect(drawerSource).not.toContain("setCouponCodeInput");
    expect(drawerSource).not.toContain("setCouponMessage");
  });
});
