import { spawnSync } from "node:child_process";

import { getDemoBurgerEnvironment } from "./demo-burger-environment.mjs";
import { seedDemoBurger } from "./seed-demo-burger.mjs";

const mode = process.argv[2] ?? "dev";
const allowedModes = new Set(["dev", "test", "visual"]);

if (!allowedModes.has(mode)) {
  throw new Error(`Modo desconhecido: ${mode}. Use dev, test ou visual.`);
}

await seedDemoBurger({ reset: mode !== "dev" });
const environment = getDemoBurgerEnvironment();

if (mode === "visual") {
  try {
    const response = await fetch("http://localhost:3000", {
      signal: AbortSignal.timeout(10_000),
    });
    const html = await response.text();

    if (response.ok && html.includes("Brasa Burger") && html.includes("X-Bacon")) {
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
    "tests/unit/demo-burger-catalog.test.ts",
    "tests/integration/demo-burger-commercial-local.test.ts",
  ],
  visual: [
    "exec",
    "--",
    "playwright",
    "test",
    "tests/e2e/demo-burger-commercial.spec.ts",
  ],
};

const isWindows = process.platform === "win32";
const executable = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
const commandArguments = isWindows
  ? ["/d", "/s", "/c", `npm.cmd ${commands[mode].join(" ")}`]
  : commands[mode];
const result = spawnSync(executable, commandArguments, {
  cwd: process.cwd(),
  env: environment,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
