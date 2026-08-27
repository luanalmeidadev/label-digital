import { spawnSync } from "node:child_process";

import { getLocalSupabaseEnvironment } from "./local-supabase-env.mjs";

const { apiUrl, serviceRoleKey, anonKey } = getLocalSupabaseEnvironment();
const isWindows = process.platform === "win32";
const commandShell = process.env.ComSpec ?? "cmd.exe";

const testCommand = isWindows ? commandShell : "npm";
const testArguments = isWindows
  ? [
      "/d",
      "/s",
      "/c",
      "npm.cmd exec -- vitest run tests/integration/food-catalog-local.test.ts tests/integration/food-catalog-admin-local.test.ts tests/integration/configured-checkout-local.test.ts",
    ]
  : [
      "exec",
      "--",
      "vitest",
      "run",
      "tests/integration/food-catalog-local.test.ts",
      "tests/integration/food-catalog-admin-local.test.ts",
      "tests/integration/configured-checkout-local.test.ts",
    ];

const testResult = spawnSync(
  testCommand,
  testArguments,
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      LOCAL_SUPABASE_URL: apiUrl,
      LOCAL_SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      LOCAL_SUPABASE_ANON_KEY: anonKey,
    },
    stdio: "inherit",
  }
);

if (testResult.error) {
  throw testResult.error;
}

process.exit(testResult.status ?? 1);
