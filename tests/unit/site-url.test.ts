import { afterEach, describe, expect, it, vi } from "vitest";

import { getSiteUrl } from "@/lib/site-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("URL pública da instalação", () => {
  it("prioriza SITE_URL", () => {
    vi.stubEnv("SITE_URL", "https://loja.example.com");

    expect(getSiteUrl().toString()).toBe("https://loja.example.com/");
  });

  it("usa a URL do preview fora da produção", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "preview.example.vercel.app");

    expect(getSiteUrl().toString()).toBe(
      "https://preview.example.vercel.app/"
    );
  });

  it("usa localhost apenas em desenvolvimento ou teste local", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("VERCEL_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");

    expect(getSiteUrl().toString()).toBe("http://localhost:3000/");
  });

  it("exige SITE_URL explicitamente em produção", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_ENV", "production");

    expect(() => getSiteUrl()).toThrow(
      "SITE_URL é obrigatória no ambiente de produção."
    );
  });

  it("rejeita protocolos inseguros ou inválidos", () => {
    vi.stubEnv("SITE_URL", "javascript:alert(1)");

    expect(() => getSiteUrl()).toThrow("SITE_URL deve usar http ou https.");
  });
});
