import { describe, expect, it } from "vitest";

import { parsePlatformDemoManifest } from "@/config/installation/platform-manifest.mjs";
import {
  createPlatformDemoEnvironment,
  isCompatiblePlatformDemoHtml,
} from "../../scripts/platform-demo-environment.mjs";

const manifest = parsePlatformDemoManifest({
  schemaVersion: 1,
  generatedAt: "2026-08-28T12:00:00.000Z",
  business: {
    name: "Brasa Burger",
    slug: "brasa-burger",
    segment: "hamburgueria",
    preset: "demo-burger",
  },
  theme: { primary: "#155EEF", secondary: "#0E9384" },
  contact: {},
  location: {},
});

const localEnvironment = {
  NODE_ENV: "development",
  SITE_URL: "http://127.0.0.1:3100",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  LOCAL_SUPABASE_URL: "http://localhost:54321",
  VERCEL_ENV: "production",
  VERCEL_URL: "example.vercel.app",
};

describe("isolamento do runner de manifesto", () => {
  it("ativa apenas o preset e manifesto públicos no ambiente local", () => {
    const environment = createPlatformDemoEnvironment(
      localEnvironment,
      manifest
    );

    expect(environment).toMatchObject({
      NEXT_PUBLIC_INSTALLATION_PRESET: "demo-burger",
      NEXT_PUBLIC_INSTALLATION_DEMO_MODE: "local",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      PLAYWRIGHT_PLATFORM_MANIFEST: "1",
    });
    expect(environment.NEXT_PUBLIC_PLATFORM_DEMO_MANIFEST).toContain(
      '"name":"Brasa Burger"'
    );
    expect(environment).not.toHaveProperty("VERCEL_ENV");
    expect(environment).not.toHaveProperty("VERCEL_URL");
  });

  it.each([
    ["NEXT_PUBLIC_SUPABASE_URL", "https://remote.supabase.co"],
    ["LOCAL_SUPABASE_URL", "https://remote.supabase.co"],
    ["SITE_URL", "https://demo.example.com"],
  ])("bloqueia %s remota", (key, value) => {
    expect(() =>
      createPlatformDemoEnvironment(
        { ...localEnvironment, [key]: value },
        manifest
      )
    ).toThrow("não é local");
  });

  it("não reutiliza servidor do preset base por correspondência parcial do nome", () => {
    expect(
      isCompatiblePlatformDemoHtml(
        '<html data-installation-slug="brasa-burger-demo"><body>Brasa Burger Demo X-Bacon</body></html>',
        manifest
      )
    ).toBe(false);
    expect(
      isCompatiblePlatformDemoHtml(
        '<html data-installation-slug="brasa-burger"><body>Brasa Burger X-Bacon</body></html>',
        manifest
      )
    ).toBe(true);
  });
});
