import { describe, expect, it, vi } from "vitest";

import { parsePlatformDemoManifest } from "@/config/installation/platform-manifest.mjs";
import {
  LOCAL_DEMO_URL,
  assertDemoPortAvailable,
  assertLocalDemoInvocation,
  createDemoRuntimeDescriptor,
  createRuntimeCleanup,
  formatDemoStatus,
  getDemoAutomationCommand,
  parseDemoRuntimeArguments,
  waitForDemoReadiness,
} from "../../scripts/local-demo-runtime.mjs";

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

const descriptor = createDemoRuntimeDescriptor(
  "C:\\demos\\brasa-burger.json",
  manifest
);

describe("runtime local de demonstração", () => {
  it("interpreta serve, reset, test, visual e json sem confundir o path", () => {
    expect(parseDemoRuntimeArguments(["demo.json"])).toMatchObject({
      mode: "serve",
      reset: false,
      json: false,
    });
    expect(
      parseDemoRuntimeArguments(["demo.json", "--reset", "--test", "--json"])
    ).toMatchObject({ mode: "test", reset: true, json: true });
    expect(
      parseDemoRuntimeArguments(["demo.json", "--visual"])
    ).toMatchObject({ mode: "visual" });
    expect(() => parseDemoRuntimeArguments([])).toThrow("Informe um manifesto");
    expect(() =>
      parseDemoRuntimeArguments(["demo.json", "--test", "--visual"])
    ).toThrow("apenas um modo");
    expect(() => parseDemoRuntimeArguments(["demo.json", "--deploy"])).toThrow(
      "Opção desconhecida"
    );
  });

  it("bloqueia execução em produção e Vercel", () => {
    expect(() => assertLocalDemoInvocation({ NODE_ENV: "production" })).toThrow(
      "não pode ser executado"
    );
    expect(() =>
      assertLocalDemoInvocation({ NODE_ENV: "development", VERCEL_ENV: "preview" })
    ).toThrow("não pode ser executado");
    expect(() => assertLocalDemoInvocation({ NODE_ENV: "development" })).not.toThrow();
  });

  it("mantém identidade operacional explícita e output estruturado", () => {
    expect(descriptor).toMatchObject({
      manifestPath: "C:\\demos\\brasa-burger.json",
      name: "Brasa Burger",
      slug: "brasa-burger",
      preset: "demo-burger",
      segment: "hamburgueria",
      url: LOCAL_DEMO_URL,
    });
    expect(formatDemoStatus(descriptor, "ready")).toEqual({
      status: "ready",
      name: "Brasa Burger",
      slug: "brasa-burger",
      url: LOCAL_DEMO_URL,
      preset: "demo-burger",
      segment: "hamburgueria",
    });
  });

  it("recusa uma porta ocupada sem reutilizar processo externo", async () => {
    await expect(
      assertDemoPortAvailable({ probe: async () => false })
    ).rejects.toThrow("já está ocupada");
    await expect(
      assertDemoPortAvailable({ probe: async () => true })
    ).resolves.toBeUndefined();
  });

  it("só considera READY com health saudável e slug exato", async () => {
    const requestedUrls: string[] = [];
    const fetchImplementation = vi.fn(async (url: RequestInfo | URL) => {
      requestedUrls.push(String(url));
      if (String(url).endsWith("/api/health")) {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        '<html data-installation-slug="brasa-burger"><body>Demo</body></html>',
        { status: 200 }
      );
    });

    await expect(
      waitForDemoReadiness({
        descriptor,
        manifest,
        fetchImplementation,
        pollIntervalMs: 0,
      })
    ).resolves.toBeUndefined();
    expect(requestedUrls).toEqual([
      `${LOCAL_DEMO_URL}/api/health`,
      LOCAL_DEMO_URL,
    ]);
  });

  it("encerra a espera com timeout e motivo legível", async () => {
    let clock = 0;
    await expect(
      waitForDemoReadiness({
        descriptor,
        manifest,
        fetchImplementation: async () => {
          throw new Error("conexão recusada");
        },
        timeoutMs: 25,
        pollIntervalMs: 0,
        now: () => (clock += 10),
        sleep: async () => {},
      })
    ).rejects.toThrow("Timeout de 1s");
  });

  it("interrompe readiness quando o processo iniciado falha", async () => {
    await expect(
      waitForDemoReadiness({
        descriptor,
        manifest,
        getApplicationFailure: () => new Error("Next encerrou durante o startup"),
      })
    ).rejects.toThrow("Next encerrou durante o startup");
  });

  it("faz cleanup idempotente somente dos recursos registrados", () => {
    const stopApplication = vi.fn();
    const stopSupabase = vi.fn();
    const cleanup = createRuntimeCleanup({ stopApplication, stopSupabase });

    cleanup();
    cleanup();

    expect(stopApplication).toHaveBeenCalledTimes(1);
    expect(stopSupabase).toHaveBeenCalledTimes(1);
  });

  it("define automações compatíveis para test e visual", () => {
    expect(getDemoAutomationCommand("test")).toContain(
      "tests/integration/demo-burger-commercial-local.test.ts"
    );
    expect(getDemoAutomationCommand("visual")).toContain(
      "tests/e2e/platform-demo-manifest.spec.ts"
    );
    expect(getDemoAutomationCommand("serve")).toBeNull();
  });
});
