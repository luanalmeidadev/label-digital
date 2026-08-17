import { createClient } from "@supabase/supabase-js";

const url =
  process.env.HOMOLOGATION_SUPABASE_URL;
const serviceRoleKey =
  process.env.HOMOLOGATION_SUPABASE_SERVICE_ROLE_KEY;
const email =
  process.env.HOMOLOGATION_ADMIN_EMAIL?.trim().toLowerCase();
const name =
  process.env.HOMOLOGATION_ADMIN_NAME?.trim();
const siteUrl =
  process.env.HOMOLOGATION_SITE_URL?.trim();
const replacePendingAdmin =
  process.env.HOMOLOGATION_REPLACE_PENDING_ADMIN ===
  "true";

if (
  !url ||
  !serviceRoleKey ||
  !email ||
  !name ||
  !siteUrl
) {
  throw new Error(
    "Configure as credenciais, o endereço da homologação e os dados do administrador."
  );
}

if (!email.includes("@")) {
  throw new Error("Informe um e-mail válido.");
}

const parsedSiteUrl = new URL(siteUrl);

if (
  parsedSiteUrl.hostname !==
  "homologacao.labelconfeitaria.com.br"
) {
  throw new Error(
    "O bootstrap só pode usar o domínio oficial de homologação."
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

const permissions = [
  "catalog",
  "orders",
  "customers",
  "deliveries",
  "billing",
  "settings",
];

const { data: usersData, error: usersError } =
  await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

if (usersError) {
  throw new Error(
    `Falha ao consultar usuários: ${usersError.message}`
  );
}

const existingUser = usersData.users.find(
  (user) => user.email?.toLowerCase() === email
);

if (existingUser) {
  if (!replacePendingAdmin) {
    throw new Error(
      "Já existe uma conta de homologação com este e-mail."
    );
  }

  if (existingUser.email_confirmed_at) {
    throw new Error(
      "A conta existente já foi confirmada e não pode ser substituída."
    );
  }

  const { error: removeProfileError } =
    await supabase
      .from("admin_profiles")
      .delete()
      .eq("id", existingUser.id);

  if (removeProfileError) {
    throw new Error(
      `Falha ao remover perfil pendente: ${removeProfileError.message}`
    );
  }

  const { error: removeUserError } =
    await supabase.auth.admin.deleteUser(
      existingUser.id
    );

  if (removeUserError) {
    throw new Error(
      `Falha ao revogar convite pendente: ${removeUserError.message}`
    );
  }
}

const redirectTo = new URL(
  "/admin/auth/confirm",
  parsedSiteUrl
).toString();
const { data, error: inviteError } =
  await supabase.auth.admin.inviteUserByEmail(
    email,
    {
      data: { name },
      redirectTo,
    }
  );

if (inviteError || !data.user) {
  throw new Error(
    `Falha ao enviar convite: ${inviteError?.message ?? "usuário não retornado"}`
  );
}

const { error: metadataError } =
  await supabase.auth.admin.updateUserById(
    data.user.id,
    {
      app_metadata: {
        label_role: "admin",
        label_permissions: permissions,
      },
    }
  );

if (metadataError) {
  await supabase.auth.admin.deleteUser(
    data.user.id
  );
  throw new Error(
    `Falha ao configurar permissões: ${metadataError.message}`
  );
}

const { error: profileError } = await supabase
  .from("admin_profiles")
  .insert({
    id: data.user.id,
    name,
  });

if (profileError) {
  await supabase.auth.admin.deleteUser(
    data.user.id
  );
  throw new Error(
    `Falha ao criar perfil: ${profileError.message}`
  );
}

console.log(
  `Convite enviado e administrador criado: ${email}`
);
