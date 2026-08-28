import { createServer } from "node:net";
import { resolve } from "node:path";

import { isCompatiblePlatformDemoHtml } from "./platform-demo-environment.mjs";

export const LOCAL_DEMO_HOST = "127.0.0.1";
export const LOCAL_DEMO_PORT = 3100;
export const LOCAL_DEMO_URL = `http://${LOCAL_DEMO_HOST}:${LOCAL_DEMO_PORT}`;
export const LOCAL_DEMO_STARTUP_TIMEOUT_MS = 120_000;

const allowedArguments = new Set(["--test", "--visual", "--reset", "--json"]);

export function parseDemoRuntimeArguments(argumentsList) {
  const unknownArguments = argumentsList.filter(
    (argument) => argument.startsWith("--") && !allowedArguments.has(argument)
  );
  if (unknownArguments.length > 0) {
    throw new Error(`Opção desconhecida: ${unknownArguments.join(", ")}.`);
  }

  const positionalArguments = argumentsList.filter(
    (argument) => !argument.startsWith("--")
  );
  if (positionalArguments.length !== 1) {
    throw new Error(
      'Informe um manifesto JSON. Exemplo: npm run demo:serve -- "C:\\demos\\brasa-burger.json"'
    );
  }

  const testMode = argumentsList.includes("--test");
  const visualMode = argumentsList.includes("--visual");
  if (testMode && visualMode) {
    throw new Error("Use apenas um modo de automação: --test ou --visual.");
  }

  return Object.freeze({
    manifestPath: resolve(positionalArguments[0]),
    mode: testMode ? "test" : visualMode ? "visual" : "serve",
    reset: argumentsList.includes("--reset"),
    json: argumentsList.includes("--json"),
  });
}

export function assertLocalDemoInvocation(environment = process.env) {
  if (environment.NODE_ENV === "production" || environment.VERCEL_ENV) {
    throw new Error(
      "O runtime de demonstração local não pode ser executado em ambiente de produção ou Vercel."
    );
  }
}

export function createDemoRuntimeDescriptor(manifestPath, manifest) {
  return Object.freeze({
    manifestPath,
    name: manifest.business.name,
    slug: manifest.business.slug,
    preset: manifest.business.preset,
    segment: manifest.business.segment,
    host: LOCAL_DEMO_HOST,
    port: LOCAL_DEMO_PORT,
    url: LOCAL_DEMO_URL,
  });
}

function probePort(host, port) {
  return new Promise((resolveProbe, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", (error) => {
      if (error && error.code === "EADDRINUSE") {
        resolveProbe(false);
        return;
      }
      reject(error);
    });
    server.listen({ host, port, exclusive: true }, () => {
      server.close(() => resolveProbe(true));
    });
  });
}

/** @type {() => Error | null} */
const noApplicationFailure = () => null;

export async function assertDemoPortAvailable({
  host = LOCAL_DEMO_HOST,
  port = LOCAL_DEMO_PORT,
  probe = probePort,
} = {}) {
  if (!(await probe(host, port))) {
    throw new Error(
      `A porta ${host}:${port} já está ocupada. Encerre a instância existente antes de iniciar esta demo; nenhum processo externo foi reutilizado.`
    );
  }
}

export async function waitForDemoReadiness({
  descriptor,
  manifest,
  fetchImplementation = fetch,
  timeoutMs = LOCAL_DEMO_STARTUP_TIMEOUT_MS,
  pollIntervalMs = 750,
  now = Date.now,
  sleep = (duration) => new Promise((resolveSleep) => setTimeout(resolveSleep, duration)),
  getApplicationFailure = noApplicationFailure,
}) {
  const startedAt = now();
  let lastFailure = "a aplicação ainda não respondeu";

  while (now() - startedAt < timeoutMs) {
    const applicationFailure = getApplicationFailure();
    if (applicationFailure) throw applicationFailure;

    try {
      const healthResponse = await fetchImplementation(`${descriptor.url}/api/health`, {
        signal: AbortSignal.timeout(Math.min(5_000, timeoutMs)),
      });
      const health = healthResponse.ok ? await healthResponse.json() : null;
      if (!healthResponse.ok || health?.status !== "ok") {
        lastFailure = `health retornou HTTP ${healthResponse.status}`;
        await sleep(pollIntervalMs);
        continue;
      }

      const homeResponse = await fetchImplementation(descriptor.url, {
        signal: AbortSignal.timeout(Math.min(5_000, timeoutMs)),
      });
      const html = homeResponse.ok ? await homeResponse.text() : "";
      if (homeResponse.ok && isCompatiblePlatformDemoHtml(html, manifest)) {
        return;
      }

      lastFailure = homeResponse.ok
        ? `a aplicação respondeu com identidade diferente de ${descriptor.slug}`
        : `a Home retornou HTTP ${homeResponse.status}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `Timeout de ${Math.ceil(timeoutMs / 1000)}s aguardando a demo ${descriptor.slug}: ${lastFailure}.`
  );
}

export function createRuntimeCleanup({ stopApplication, stopSupabase }) {
  let cleaned = false;

  return () => {
    if (cleaned) return;
    cleaned = true;
    stopApplication();
    stopSupabase?.();
  };
}

export function getDemoAutomationCommand(mode) {
  if (mode === "test") {
    return Object.freeze([
      "exec",
      "--",
      "vitest",
      "run",
      "--no-file-parallelism",
      "tests/unit/platform-demo-manifest.test.ts",
      "tests/unit/platform-demo-environment.test.ts",
      "tests/unit/local-demo-runtime.test.ts",
      "tests/unit/demo-burger-catalog.test.ts",
      "tests/integration/demo-burger-commercial-local.test.ts",
    ]);
  }

  if (mode === "visual") {
    return Object.freeze([
      "exec",
      "--",
      "playwright",
      "test",
      "tests/e2e/platform-demo-manifest.spec.ts",
    ]);
  }

  return null;
}

export function formatDemoStatus(descriptor, status, message) {
  return {
    status,
    name: descriptor.name,
    slug: descriptor.slug,
    url: descriptor.url,
    preset: descriptor.preset,
    segment: descriptor.segment,
    ...(message ? { message } : {}),
  };
}
