import { spawnSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

import { getLocalSupabaseEnvironment } from "./local-supabase-env.mjs";
import { getStorageBuckets } from "./backup-inventory.mjs";
import { labelInstallationModules } from "../config/installation/module-presets.mjs";

const { apiUrl, serviceRoleKey } = getLocalSupabaseEnvironment();
const supabase = createClient(apiUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
const expectedBuckets = getStorageBuckets(labelInstallationModules);
const { data: currentBuckets, error: bucketsError } =
  await supabase.storage.listBuckets();

if (bucketsError) {
  throw new Error(
    `Falha ao listar os buckets locais: ${bucketsError.message}`
  );
}

const currentBucketNames = new Set(
  (currentBuckets ?? []).map((bucket) => bucket.name)
);

for (const bucket of expectedBuckets) {
  if (currentBucketNames.has(bucket)) {
    continue;
  }

  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
  });

  if (error) {
    throw new Error(
      `Falha ao criar o bucket local ${bucket}: ${error.message}`
    );
  }
}

const checkResult = spawnSync(
  process.execPath,
  ["scripts/backup-supabase.mjs", "--check"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: apiUrl,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      NEXT_PUBLIC_INSTALLATION_PRESET: "label",
    },
    stdio: "inherit",
  }
);

if (checkResult.error) {
  throw checkResult.error;
}

process.exit(checkResult.status ?? 1);
