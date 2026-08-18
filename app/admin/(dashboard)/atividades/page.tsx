import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ChevronDown,
  Filter,
  History,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { getAdminAccess } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AuditAction = "created" | "updated" | "deleted";

type AuditLog = {
  id: number;
  actor_name: string;
  actor_email: string | null;
  actor_role: "admin" | "attendant";
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

const actionLabels: Record<AuditAction, string> = {
  created: "Criação",
  updated: "Alteração",
  deleted: "Exclusão",
};

const actionClasses: Record<AuditAction, string> = {
  created: "bg-emerald-100 text-emerald-700",
  updated: "bg-blue-100 text-blue-700",
  deleted: "bg-red-100 text-red-700",
};

const entityLabels: Record<string, string> = {
  product: "Produtos",
  category: "Categorias",
  order: "Pedidos",
  preorder: "Encomendas",
  preorder_product: "Cardápio de encomendas",
  preorder_hero: "Imagem das encomendas",
  store_settings: "Dados da loja",
  business_hours: "Horários",
  delivery_zone: "Regiões de entrega",
  admin_account: "Contas administrativas",
};

const fieldLabels: Record<string, string> = {
  active: "Ativo",
  address_city: "Cidade",
  address_state: "Estado",
  allowed_quantities: "Quantidades permitidas",
  amount_paid: "Valor recebido",
  available: "Disponibilidade",
  before: "Antes",
  category_id: "Categoria",
  closes_at: "Fechamento",
  completed_at: "Finalização",
  delivery_enabled: "Entrega habilitada",
  delivery_fee: "Taxa de entrega",
  desired_date: "Data desejada",
  email: "E-mail",
  fee_type: "Tipo de taxa",
  featured: "Destaque",
  flavor_quantity_step: "Quantidade por sabor",
  flavors: "Sabores",
  fulfillment_type: "Recebimento",
  image_changed: "Imagem alterada",
  image_position_x: "Posição horizontal",
  image_position_y: "Posição vertical",
  image_zoom: "Zoom",
  instagram: "Instagram",
  is_open: "Aberto",
  lead_time_days: "Antecedência",
  max_flavors: "Limite de sabores",
  minimum_quantity: "Quantidade mínima",
  name: "Nome",
  neighborhood: "Região",
  opens_at: "Abertura",
  option_label: "Opção",
  order_type: "Tipo do pedido",
  permissions: "Permissões",
  pickup_enabled: "Retirada habilitada",
  position_x: "Posição horizontal",
  position_y: "Posição vertical",
  price: "Preço",
  price_base_quantity: "Quantidade do preço-base",
  prices: "Preços",
  product_name: "Produto",
  quantity: "Quantidade",
  quantity_increment: "Incremento",
  quantity_unit: "Unidade",
  request_number: "Número da encomenda",
  role: "Perfil",
  sort_order: "Posição",
  status: "Situação",
  store_name: "Nome da loja",
  subtotal: "Subtotal",
  total: "Total",
  values: "Dados",
  weekday: "Dia da semana",
  whatsapp: "WhatsApp",
  zoom: "Zoom",
};

const statusLabels: Record<string, string> = {
  created: "Criado",
  sent_to_whatsapp: "Enviado ao WhatsApp",
  new: "Nova",
  confirmed: "Confirmado",
  ready_for_pickup: "Pronto para retirada",
  out_for_delivery: "Saiu para entrega",
  completed: "Finalizado",
  cancelled: "Cancelado",
  pickup: "Retirada",
  delivery: "Entrega",
  fixed: "Taxa fixa",
  consult: "Consultar taxa",
  admin: "Administrador",
  attendant: "Atendente",
};

const entityOptions = Object.entries(entityLabels);
const allowedEntities = new Set(entityOptions.map(([value]) => value));
const allowedActions = new Set(["created", "updated", "deleted"]);
const allowedPeriods = new Set(["7", "30", "90"]);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Não informado";
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  if (Array.isArray(value)) {
    return value.length > 0
      ? value
          .map((item) =>
            typeof item === "object"
              ? JSON.stringify(item)
              : String(item)
          )
          .join(", ")
      : "Nenhum";
  }

  if (
    ["price", "subtotal", "total", "delivery_fee", "amount_paid"].includes(
      key
    ) &&
    typeof value === "number"
  ) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  if (typeof value === "string") {
    return statusLabels[value] ?? value;
  }

  return String(value);
}

function MetadataDetails({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata);

  if (entries.length === 0) {
    return null;
  }

  return (
    <details className="mt-4 rounded-2xl border border-[#EEE6DF] bg-[#FFFDF9] px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-[#8B0000]">
        Ver detalhes
        <ChevronDown size={16} />
      </summary>

      <dl className="mt-3 grid gap-3 border-t border-[#EEE6DF] pt-3 sm:grid-cols-2">
        {entries.map(([key, value]) => {
          const change =
            value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            ("before" in value || "after" in value)
              ? (value as { before?: unknown; after?: unknown })
              : null;

          return (
            <div key={key} className="min-w-0">
              <dt className="text-xs font-bold uppercase tracking-wide text-[#756A66]">
                {fieldLabels[key] ?? key.replaceAll("_", " ")}
              </dt>
              <dd className="mt-1 break-words text-sm text-[#241B19]">
                {change ? (
                  <>
                    {formatValue(key, change.before)}
                    <span className="mx-2 text-[#A89C96]">→</span>
                    <strong>{formatValue(key, change.after)}</strong>
                  </>
                ) : value && typeof value === "object" && !Array.isArray(value) ? (
                  <span className="whitespace-pre-wrap text-xs leading-5">
                    {Object.entries(value)
                      .map(
                        ([nestedKey, nestedValue]) =>
                          `${fieldLabels[nestedKey] ?? nestedKey.replaceAll("_", " ")}: ${formatValue(nestedKey, nestedValue)}`
                      )
                      .join("\n")}
                  </span>
                ) : (
                  formatValue(key, value)
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </details>
  );
}

export default async function AtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{
    area?: string;
    action?: string;
    period?: string;
  }>;
}) {
  const access = await getAdminAccess();

  if (access.role !== "admin") {
    redirect("/admin?error=forbidden");
  }

  const params = await searchParams;
  const area = allowedEntities.has(params.area ?? "") ? params.area! : "";
  const action = allowedActions.has(params.action ?? "")
    ? (params.action as AuditAction)
    : "";
  const period = allowedPeriods.has(params.period ?? "")
    ? params.period!
    : "30";
  const adminClient = createSupabaseAdminClient();
  let query = adminClient
    .from("admin_audit_logs")
    .select(
      "id, actor_name, actor_email, actor_role, action, entity_type, entity_id, summary, metadata, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (area) {
    query = query.eq("entity_type", area);
  }

  if (action) {
    query = query.eq("action", action);
  }

  if (period) {
    const start = new Date();
    start.setDate(start.getDate() - Number(period));
    query = query.gte("created_at", start.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao carregar o histórico administrativo:", error);
    throw new Error("Não foi possível carregar o histórico de atividades.");
  }

  const logs = (data ?? []) as AuditLog[];

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Segurança e controle
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
            Histórico de atividades
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#756A66]">
            Veja quem alterou produtos, pedidos, encomendas, configurações e
            contas administrativas.
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-[#EEE6DF] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
              <Filter size={20} />
            </div>
            <div>
              <h2 className="font-bold text-[#241B19]">Filtrar atividades</h2>
              <p className="text-xs text-[#756A66]">
                Consulte até 200 registros por vez.
              </p>
            </div>
          </div>

          <form className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <select
              name="area"
              defaultValue={area}
              className="h-11 rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
            >
              <option value="">Todas as áreas</option>
              {entityOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              name="action"
              defaultValue={action}
              className="h-11 rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
            >
              <option value="">Todas as ações</option>
              <option value="created">Criações</option>
              <option value="updated">Alterações</option>
              <option value="deleted">Exclusões</option>
            </select>

            <select
              name="period"
              defaultValue={period}
              className="h-11 rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>

            <button
              type="submit"
              className="h-11 rounded-xl bg-[#8B0000] px-5 text-sm font-bold text-white transition hover:bg-[#700000]"
            >
              Aplicar
            </button>
            <Link
              href="/admin/atividades"
              className="flex h-11 items-center justify-center rounded-xl border border-[#DDD3CB] px-5 text-sm font-bold text-[#756A66]"
            >
              Limpar
            </Link>
          </form>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-[#EEE6DF] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
                <History size={20} />
              </div>
              <div>
                <h2 className="font-bold text-[#241B19]">Atividades registradas</h2>
                <p className="text-xs text-[#756A66]">{logs.length} registro(s)</p>
              </div>
            </div>
            <ShieldCheck className="text-emerald-600" size={22} />
          </div>

          {logs.length > 0 ? (
            <div className="divide-y divide-[#EEE6DF]">
              {logs.map((log) => (
                <article key={log.id} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${actionClasses[log.action]}`}
                        >
                          {actionLabels[log.action]}
                        </span>
                        <span className="rounded-full bg-[#F4EEEA] px-2.5 py-1 text-xs font-bold text-[#756A66]">
                          {entityLabels[log.entity_type] ?? log.entity_type}
                        </span>
                      </div>
                      <h3 className="mt-3 font-bold text-[#241B19]">
                        {log.summary}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#756A66]">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound size={14} />
                          {log.actor_name}
                        </span>
                        <span>
                          {log.actor_role === "admin" ? "Administrador" : "Atendente"}
                        </span>
                        {log.actor_email && <span>{log.actor_email}</span>}
                      </div>
                    </div>
                    <time className="shrink-0 text-xs font-semibold text-[#756A66]">
                      {formatDate(log.created_at)}
                    </time>
                  </div>

                  <MetadataDetails metadata={log.metadata ?? {}} />
                </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B0000]/10 text-[#8B0000]">
                <History size={28} />
              </div>
              <h3 className="mt-5 text-xl font-bold text-[#241B19]">
                Nenhuma atividade encontrada
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#756A66]">
                Ajuste os filtros ou faça uma alteração administrativa para
                iniciar o histórico.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
