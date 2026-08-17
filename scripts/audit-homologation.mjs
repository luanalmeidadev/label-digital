import { createClient } from "@supabase/supabase-js";

const url =
  process.env.HOMOLOGATION_SUPABASE_URL;
const serviceRoleKey =
  process.env.HOMOLOGATION_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Configure as credenciais de homologação antes da auditoria."
  );
}

const supabase = createClient(
  url,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const emptyTables = [
  "customers",
  "addresses",
  "orders",
  "order_items",
  "admin_profiles",
];

let hasUnexpectedData = false;

for (const table of emptyTables) {
  const { count, error } = await supabase
    .from(table)
    .select("id", {
      count: "exact",
      head: true,
    });

  if (error) {
    throw new Error(
      `Falha ao auditar ${table}: ${error.message}`
    );
  }

  console.log(`${table}=${count ?? 0}`);
  hasUnexpectedData ||= (count ?? 0) !== 0;
}

const { data: users, error: usersError } =
  await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

if (usersError) {
  throw new Error(
    `Falha ao auditar usuários: ${usersError.message}`
  );
}

console.log(`auth_users=${users.users.length}`);
hasUnexpectedData ||= users.users.length !== 0;

const { data: requests, error: requestsError } =
  await supabase.storage
    .from("preorder-catalog")
    .list("requests", { limit: 1 });

if (requestsError) {
  throw new Error(
    `Falha ao auditar encomendas: ${requestsError.message}`
  );
}

console.log(
  `preorder_requests=${requests?.length ?? 0}`
);
hasUnexpectedData ||=
  (requests?.length ?? 0) !== 0;

if (hasUnexpectedData) {
  throw new Error(
    "A homologação contém dados que deveriam permanecer vazios."
  );
}

console.log(
  "Auditoria concluída: dados pessoais e vendas estão vazios."
);
