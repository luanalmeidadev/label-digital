import { readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { parsePlatformDemoManifestJson } from "../config/installation/platform-manifest.mjs";
import { getDemoBurgerEnvironment } from "./demo-burger-environment.mjs";
import {
  assertDemoPortAvailable,
  assertLocalDemoInvocation,
  createDemoRuntimeDescriptor,
  createRuntimeCleanup,
  formatDemoStatus,
  getDemoAutomationCommand,
  parseDemoRuntimeArguments,
  waitForDemoReadiness,
} from "./local-demo-runtime.mjs";
import { createPlatformDemoEnvironment } from "./platform-demo-environment.mjs";
import { seedDemoBurger } from "./seed-demo-burger.mjs";

const seedByPreset = Object.freeze({
  "demo-burger": seedDemoBurger,
});

function loadManifest(manifestPath) {
  if (extname(manifestPath).toLowerCase() !== ".json") {
    throw new Error("O manifesto deve ser um arquivo com extensão .json.");
  }

  const manifestFile = statSync(manifestPath);
  if (!manifestFile.isFile()) {
    throw new Error("O caminho informado não aponta para um arquivo.");
  }
  if (manifestFile.size > 64 * 1024) {
    throw new Error("O manifesto excede o limite de 64 KB.");
  }

  return parsePlatformDemoManifestJson(readFileSync(manifestPath, "utf8"));
}

function runLocalSupabase(argumentsList) {
  const isWindows = process.platform === "win32";
  const executable = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npx";
  const commandArguments = isWindows
    ? ["/d", "/s", "/c", `npx.cmd supabase ${argumentsList.join(" ")}`]
    : ["supabase", ...argumentsList];

  const result = spawnSync(executable, commandArguments, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result;
}

function ensureLocalSupabase() {
  const status = runLocalSupabase(["status", "-o", "env"]);
  if (status.status === 0) return false;

  const start = runLocalSupabase(["start"]);
  if (start.error) throw start.error;
  if (start.status !== 0) {
    throw new Error("Não foi possível iniciar o Supabase local.");
  }

  return true;
}

function resetLocalSupabase() {
  const reset = runLocalSupabase(["db", "reset", "--local"]);
  if (reset.error) throw reset.error;
  if (reset.status !== 0) {
    throw new Error("Não foi possível resetar o banco Supabase local.");
  }
}

function stopLocalSupabase() {
  runLocalSupabase(["stop"]);
}

function stopOwnedApplication(application) {
  if (!application?.pid || application.exitCode !== null) return;

  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/pid", String(application.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  application.kill("SIGTERM");
}

function startApplication(environment, { json }) {
  const nextExecutable = resolve(
    process.cwd(),
    "node_modules/next/dist/bin/next"
  );
  const application = spawn(
    process.execPath,
    [nextExecutable, "dev", "--hostname", "127.0.0.1", "--port", "3100"],
    {
      cwd: process.cwd(),
      env: environment,
      stdio: json ? ["ignore", "pipe", "pipe"] : "inherit",
    }
  );

  if (json) {
    application.stdout?.on("data", (chunk) => process.stderr.write(chunk));
    application.stderr?.on("data", (chunk) => process.stderr.write(chunk));
  }

  return application;
}

function runAutomation(mode, environment, json) {
  const command = getDemoAutomationCommand(mode);
  if (!command) return 0;

  const isWindows = process.platform === "win32";
  const executable = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
  const commandArguments = isWindows
    ? ["/d", "/s", "/c", `npm.cmd ${command.join(" ")}`]
    : command;
  const result = spawnSync(executable, commandArguments, {
    cwd: process.cwd(),
    env: environment,
    encoding: json ? "utf8" : undefined,
    stdio: json ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.error) throw result.error;
  if (json) {
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  return result.status ?? 1;
}

function printReady(descriptor, json) {
  if (json) {
    console.log(JSON.stringify(formatDemoStatus(descriptor, "ready")));
    return;
  }

  console.log("");
  console.log(`Demo: ${descriptor.name}`);
  console.log("Status: READY");
  console.log(`URL: ${descriptor.url}`);
  console.log(`Slug: ${descriptor.slug}`);
}

function printFailure(descriptor, json, error) {
  const message = error instanceof Error ? error.message : String(error);
  if (json) {
    console.log(
      JSON.stringify(
        descriptor
          ? formatDemoStatus(descriptor, "failed", message)
          : { status: "failed", message }
      )
    );
    return;
  }

  console.error("Status: FAILED");
  console.error(`Erro: ${message}`);
}

async function main() {
  let descriptor;
  let cleanup = () => {};
  let options;

  try {
    assertLocalDemoInvocation();
    options = parseDemoRuntimeArguments(process.argv.slice(2));
    const log = options.json ? () => {} : console.log;

    log("[1/5] Validando manifesto...");
    const manifest = loadManifest(options.manifestPath);
    descriptor = createDemoRuntimeDescriptor(options.manifestPath, manifest);
    const seed = seedByPreset[descriptor.preset];
    if (!seed) {
      throw new Error(
        `O preset ${descriptor.preset} não possui seed local registrado.`
      );
    }

    await assertDemoPortAvailable();
    log("[2/5] Garantindo Supabase local...");
    const startedSupabase = ensureLocalSupabase();
    let application;
    cleanup = createRuntimeCleanup({
      stopApplication: () => stopOwnedApplication(application),
      stopSupabase: startedSupabase
        ? stopLocalSupabase
        : undefined,
    });

    const stopOnSignal = (signal) => {
      if (!options.json) console.log(`\nEncerrando demo (${signal})...`);
      cleanup();
      process.exit(signal === "SIGINT" ? 130 : 143);
    };
    process.once("SIGINT", () => stopOnSignal("SIGINT"));
    process.once("SIGTERM", () => stopOnSignal("SIGTERM"));

    if (options.reset) {
      log("[3/5] Resetando banco local e reaplicando migrations...");
      resetLocalSupabase();
    } else {
      log(`[3/5] Preparando preset ${descriptor.preset}...`);
    }

    await seed({ reset: !options.reset && options.mode !== "serve" });
    const environment = createPlatformDemoEnvironment(
      getDemoBurgerEnvironment(),
      manifest
    );
    environment.SITE_URL = descriptor.url;
    environment.PLAYWRIGHT_BASE_URL = descriptor.url;

    log("[4/5] Iniciando aplicação...");
    application = startApplication(environment, options);
    let applicationFailure;
    application.once("error", (error) => {
      applicationFailure = error;
    });

    await waitForDemoReadiness({
      descriptor,
      manifest,
      getApplicationFailure: () => {
        if (applicationFailure) return applicationFailure;
        if (application.exitCode !== null) {
          return new Error(
            `O processo Next.js foi encerrado com código ${application.exitCode}.`
          );
        }
        return null;
      },
    });
    log("[5/5] Demo pronta.");
    printReady(descriptor, options.json);

    if (options.mode !== "serve") {
      const status = runAutomation(options.mode, environment, options.json);
      cleanup();
      if (status !== 0) {
        printFailure(
          descriptor,
          options.json,
          new Error(`O modo --${options.mode} terminou com código ${status}.`)
        );
      }
      process.exitCode = status;
      return;
    }

    const status = await new Promise((resolveStatus) => {
      application.once("exit", (code) => resolveStatus(code ?? 1));
    });
    cleanup();
    if (status !== 0) {
      throw new Error(`O processo Next.js foi encerrado com código ${status}.`);
    }
  } catch (error) {
    cleanup();
    printFailure(descriptor, options?.json ?? false, error);
    process.exitCode = 1;
  }
}

await main();
