import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const sourceUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const sourceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const targetUrl =
  process.env.HOMOLOGATION_SUPABASE_URL;
const targetKey =
  process.env.HOMOLOGATION_SUPABASE_SERVICE_ROLE_KEY;

if (
  !sourceUrl ||
  !sourceKey ||
  !targetUrl ||
  !targetKey
) {
  throw new Error(
    "Configure as credenciais de produção e homologação antes de sincronizar."
  );
}

if (sourceUrl === targetUrl) {
  throw new Error(
    "Produção e homologação não podem apontar para o mesmo projeto."
  );
}

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};
const source = createClient(
  sourceUrl,
  sourceKey,
  clientOptions
);
const target = createClient(
  targetUrl,
  targetKey,
  clientOptions
);

const contentTables = [
  "categories",
  "products",
  "store_settings",
  "business_hours",
  "delivery_zones",
];

const bucketDefinitions = [
  {
    id: "product-images",
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  },
  {
    id: "preorder-catalog",
    public: false,
    fileSizeLimit: 1024 * 1024,
    allowedMimeTypes: ["application/json"],
  },
];

function rewriteProjectUrls(value) {
  if (typeof value === "string") {
    return value.replaceAll(sourceUrl, targetUrl);
  }

  if (Array.isArray(value)) {
    return value.map(rewriteProjectUrls);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        rewriteProjectUrls(item),
      ])
    );
  }

  return value;
}

async function syncTable(table) {
  const { data, error } = await source
    .from(table)
    .select("*");

  if (error) {
    throw new Error(
      `Falha ao ler ${table}: ${error.message}`
    );
  }

  const rows = rewriteProjectUrls(data ?? []);

  if (rows.length === 0) {
    console.log(`Tabela vazia: ${table}`);
    return;
  }

  const { error: upsertError } = await target
    .from(table)
    .upsert(rows);

  if (upsertError) {
    throw new Error(
      `Falha ao gravar ${table}: ${upsertError.message}`
    );
  }

  console.log(
    `Tabela sincronizada: ${table} (${rows.length})`
  );
}

async function ensureBuckets() {
  const { data, error } =
    await target.storage.listBuckets();

  if (error) {
    throw new Error(
      `Falha ao listar buckets: ${error.message}`
    );
  }

  const existing = new Set(
    (data ?? []).map((bucket) => bucket.id)
  );

  for (const definition of bucketDefinitions) {
    if (existing.has(definition.id)) {
      const { error: updateError } =
        await target.storage.updateBucket(
          definition.id,
          definition
        );

      if (updateError) {
        throw new Error(
          `Falha ao atualizar ${definition.id}: ${updateError.message}`
        );
      }
    } else {
      const { error: createError } =
        await target.storage.createBucket(
          definition.id,
          definition
        );

      if (createError) {
        throw new Error(
          `Falha ao criar ${definition.id}: ${createError.message}`
        );
      }
    }

    console.log(
      `Bucket preparado: ${definition.id}`
    );
  }
}

async function listStorageObjects(
  bucket,
  prefix = ""
) {
  const objects = [];
  const pageSize = 100;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await source.storage
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
      const path = prefix
        ? `${prefix}/${entry.name}`
        : entry.name;

      if (entry.id) {
        objects.push(path);
      } else {
        objects.push(
          ...(await listStorageObjects(bucket, path))
        );
      }
    }

    if (!data || data.length < pageSize) {
      break;
    }
  }

  return objects;
}

async function copyStorageObject(bucket, path) {
  const { data, error } = await source.storage
    .from(bucket)
    .download(path);

  if (error || !data) {
    throw new Error(
      `Falha ao baixar ${bucket}/${path}: ${error?.message ?? "arquivo indisponível"}`
    );
  }

  let body = data;
  let contentType = data.type || undefined;

  if (
    bucket === "preorder-catalog" &&
    path.endsWith(".json")
  ) {
    const parsed = JSON.parse(await data.text());
    body = new Blob(
      [
        JSON.stringify(
          rewriteProjectUrls(parsed),
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    contentType = "application/json";
  }

  const { error: uploadError } =
    await target.storage
      .from(bucket)
      .upload(path, body, {
        contentType,
        cacheControl:
          bucket === "preorder-catalog"
            ? "0"
            : "3600",
        upsert: true,
      });

  if (uploadError) {
    throw new Error(
      `Falha ao gravar ${bucket}/${path}: ${uploadError.message}`
    );
  }
}

async function syncProductImages() {
  const paths = await listStorageObjects(
    "product-images"
  );

  for (const path of paths) {
    await copyStorageObject(
      "product-images",
      path
    );
  }

  console.log(
    `Imagens sincronizadas: ${paths.length}`
  );
}

async function syncPreorderConfiguration() {
  const allowedPaths = [
    "catalog.json",
    "image-display-settings.json",
  ];
  let copied = 0;

  for (const path of allowedPaths) {
    const { data, error } = await source.storage
      .from("preorder-catalog")
      .download(path);

    if (error || !data) {
      continue;
    }

    await copyStorageObject(
      "preorder-catalog",
      path
    );
    copied += 1;
  }

  console.log(
    `Configurações de encomendas sincronizadas: ${copied}`
  );
}

for (const table of contentTables) {
  await syncTable(table);
}

await ensureBuckets();
await syncProductImages();
await syncPreorderConfiguration();

console.log(
  "Homologação sincronizada sem clientes, pedidos, usuários ou faturamento."
);
