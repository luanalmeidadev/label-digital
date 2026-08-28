import { readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { parsePlatformDemoManifestJson } from "../config/installation/platform-manifest.mjs";
import { getDemoBurgerEnvironment } from "./demo-burger-environment.mjs";
import { createPlatformDemoEnvironment } from "./platform-demo-environment.mjs";
import { seedDemoBurger } from "./seed-demo-burger.mjs";

const manifestArgument = process.argv[2];
const modeArgument = process.argv.slice(3).find((argument) =>
  ["--test", "--visual"].includes(argument)
);
const mode = modeArgument === "--test"
  ? "test"
  : modeArgument === "--visual"
    ? "visual"
    : "dev";

if (!manifestArgument) {
  throw new Error(
    'Informe o arquivo JSON. Exemplo: npm run demo:manifest -- "C:\\demos\\brasa-burger.json"'
  );
}

const manifestPath = resolve(manifestArgument);
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

const manifest = parsePlatformDemoManifestJson(
  readFileSync(manifestPath, "utf8")
);

const seedByPreset = Object.freeze({
  "demo-burger": seedDemoBurger,
});
const seed = seedByPreset[manifest.business.preset];
if (!seed) {
  throw new Error(
    `O preset ${manifest.business.preset} não possui seed local registrado.`
  );
}

await seed({ reset: mode !== "dev" });
const environment = createPlatformDemoEnvironment(
  getDemoBurgerEnvironment(),
  manifest
);

if (mode === "visual") {
  try {
    const response = await fetch("http://localhost:3000", {
      signal: AbortSignal.timeout(10_000),
    });
    const html = await response.text();

    if (
      response.ok &&
      html.includes(manifest.business.name) &&
      html.includes("X-Bacon")
    ) {
      environment.PLAYWRIGHT_BASE_URL = "http://localhost:3000";
    }
  } catch {
    // Sem servidor compatível: o Playwright inicia a instância isolada na porta 3100.
  }
}

const commands = {
  dev: ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3100"],
  test: [
    "exec",
    "--",
    "vitest",
    "run",
    "--no-file-parallelism",
    "tests/unit/platform-demo-manifest.test.ts",
    "tests/unit/platform-demo-environment.test.ts",
    "tests/unit/demo-burger-catalog.test.ts",
    "tests/integration/demo-burger-commercial-local.test.ts",
  ],
  visual: [
    "exec",
    "--",
    "playwright",
    "test",
    "tests/e2e/platform-demo-manifest.spec.ts",
  ],
};

const isWindows = process.platform === "win32";
const executable = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
const commandArguments = isWindows
  ? ["/d", "/s", "/c", `npm.cmd ${commands[mode].join(" ")}`]
  : commands[mode];

console.log(
  `Manifesto válido: ${manifest.business.name} (${manifest.business.preset}).`
);
console.log("Ambiente protegido: Supabase local e aplicação em 127.0.0.1:3100.");

const result = spawnSync(executable, commandArguments, {
  cwd: process.cwd(),
  env: environment,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
