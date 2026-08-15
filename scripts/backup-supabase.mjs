import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const checkOnly = process.argv.includes("--check");
const requestedBackupName = process.argv
  .slice(2)
  .find((argument) => argument !== "--check");
const backupName =
  requestedBackupName ??
  new Date().toISOString().replaceAll(":", "-");

if (!/^[a-zA-Z0-9._-]+$/.test(backupName)) {
  throw new Error(
    "Use apenas letras, números, ponto, traço ou sublinhado no nome do backup."
  );
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de executar o backup."
  );
}

const backupRoot = path.resolve(
  process.cwd(),
  "backups",
  backupName
);
const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const applicationTables = [
  "categories",
  "products",
  "customers",
  "addresses",
  "orders",
  "order_items",
  "admin_profiles",
  "store_settings",
  "business_hours",
  "delivery_zones",
];

const storageBuckets = [
  "product-images",
  "preorder-catalog",
];

if (checkOnly) {
  const [database, ...storageResults] =
    await Promise.all([
      supabase
        .from("store_settings")
        .select("id")
        .limit(1),
      ...storageBuckets.map((bucket) =>
        supabase.storage
          .from(bucket)
          .list("", { limit: 1 })
      ),
    ]);
  const failure = [
    database,
    ...storageResults,
  ].find((result) => result.error);

  if (failure?.error) {
    throw new Error(
      `Falha ao validar o backup: ${failure.error.message}`
    );
  }

  console.log(
    "Acesso ao banco e aos Storages validado. Nenhum arquivo foi criado."
  );
  process.exit(0);
}

async function exportTable(table) {
  const rows = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(
        `Falha ao exportar ${table}: ${error.message}`
      );
    }

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      break;
    }
  }

  const target = path.join(
    backupRoot,
    "data",
    `${table}.json`
  );
  await mkdir(path.dirname(target), {
    recursive: true,
  });
  await writeFile(
    target,
    JSON.stringify(rows, null, 2),
    "utf8"
  );

  return rows.length;
}

async function exportAdminAccounts() {
  const users = [];
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } =
      await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

    if (error) {
      throw new Error(
        `Falha ao listar contas: ${error.message}`
      );
    }

    users.push(
      ...data.users.map((user) => ({
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        appMetadata: user.app_metadata,
        userMetadata: user.user_metadata,
      }))
    );

    if (data.users.length < perPage) {
      break;
    }
  }

  const target = path.join(
    backupRoot,
    "data",
    "auth-users.json"
  );
  await writeFile(
    target,
    JSON.stringify(users, null, 2),
    "utf8"
  );

  return users.length;
}

function getStorageTarget(bucket, objectPath) {
  const bucketRoot = path.resolve(
    backupRoot,
    "storage",
    bucket
  );
  const target = path.resolve(
    bucketRoot,
    ...objectPath.split("/")
  );

  if (
    target !== bucketRoot &&
    !target.startsWith(`${bucketRoot}${path.sep}`)
  ) {
    throw new Error(
      `Caminho de arquivo inválido: ${objectPath}`
    );
  }

  return target;
}

async function exportStorageFolder(
  bucket,
  prefix,
  manifest
) {
  const pageSize = 100;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, {
        limit: pageSize,
        offset,
        sortBy: {
          column: "name",
          order: "asc",
        },
      });

    if (error) {
      throw new Error(
        `Falha ao listar ${bucket}/${prefix}: ${error.message}`
      );
    }

    for (const entry of data ?? []) {
      const objectPath = prefix
        ? `${prefix}/${entry.name}`
        : entry.name;

      if (!entry.id) {
        await exportStorageFolder(
          bucket,
          objectPath,
          manifest
        );
        continue;
      }

      const { data: file, error: downloadError } =
        await supabase.storage
          .from(bucket)
          .download(objectPath);

      if (downloadError || !file) {
        throw new Error(
          `Falha ao baixar ${bucket}/${objectPath}: ${downloadError?.message ?? "arquivo indisponível"}`
        );
      }

      const target = getStorageTarget(
        bucket,
        objectPath
      );
      await mkdir(path.dirname(target), {
        recursive: true,
      });
      await writeFile(
        target,
        Buffer.from(await file.arrayBuffer())
      );

      manifest.push({
        path: objectPath,
        size: entry.metadata?.size ?? file.size,
        updatedAt: entry.updated_at,
      });
    }

    if (!data || data.length < pageSize) {
      break;
    }
  }
}

await mkdir(backupRoot, { recursive: true });

const tableCounts = {};
for (const table of applicationTables) {
  tableCounts[table] = await exportTable(table);
  console.log(
    `Dados exportados: ${table} (${tableCounts[table]})`
  );
}

const adminAccounts = await exportAdminAccounts();
console.log(`Contas exportadas: ${adminAccounts}`);

const storageObjects = {};
for (const bucket of storageBuckets) {
  const bucketManifest = [];
  await exportStorageFolder(
    bucket,
    "",
    bucketManifest
  );
  storageObjects[bucket] = bucketManifest;
  console.log(
    `Storage exportado: ${bucket} (${bucketManifest.length})`
  );
}

await writeFile(
  path.join(backupRoot, "manifest.json"),
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      projectUrl: supabaseUrl,
      tableCounts,
      adminAccounts,
      storageObjects,
    },
    null,
    2
  ),
  "utf8"
);

console.log(`Backup concluído em: ${backupRoot}`);
