import {
  AtSign,
  Clock3,
  MapPin,
  MessageCircle,
  Plus,
  Settings,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";

import AdminAccountsManager from "@/components/admin/AdminAccountsManager";
import MonitoringTestCard from "@/components/admin/MonitoringTestCard";
import { getPublicInstallationProfile } from "@/config/installation/public";
import { listAdminAccounts } from "@/lib/admin-accounts";
import { getAdminAccess } from "@/lib/admin-auth";

import {
  createDeliveryZone,
  deleteDeliveryZone,
  toggleDeliveryZone,
  updateBusinessHours,
  updateDeliveryZone,
  updateStoreSettings,
} from "./actions";

const installation = getPublicInstallationProfile();

const weekdayLabels: Record<
  number,
  string
> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

function normalizeTime(
  value: string | null
) {
  if (!value) {
    return "";
  }

  return value.slice(0, 5);
}

function formatCurrency(
  value: number
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value);
}

export default async function ConfiguracoesPage() {
  const access = await getAdminAccess();
  const supabase = access.supabase;
  const accounts =
    access.role === "admin"
      ? await listAdminAccounts()
      : [];

  const {
    data: settings,
    error: settingsError,
  } = await supabase
    .from("store_settings")
    .select(`
      id,
      store_name,
      whatsapp,
      instagram,
      pickup_enabled,
      delivery_enabled,
      address_street,
      address_number,
      address_city,
      address_state
    `)
    .limit(1)
    .single();

  if (settingsError) {
    console.error(
      "Erro ao carregar configurações:",
      settingsError
    );

    throw new Error(
      "Não foi possível carregar os dados da loja."
    );
  }

  const {
    data: businessHours,
    error: hoursError,
  } = await supabase
    .from("business_hours")
    .select(`
      id,
      weekday,
      is_open,
      opens_at,
      closes_at
    `)
    .order("weekday");

  if (hoursError) {
    console.error(
      "Erro ao carregar horários:",
      hoursError
    );

    throw new Error(
      "Não foi possível carregar os horários."
    );
  }

  const {
    data: deliveryZones,
    error: zonesError,
  } = await supabase
    .from("delivery_zones")
    .select(`
      id,
      neighborhood,
      delivery_fee,
      fee_type,
      active
    `)
    .order("neighborhood");

  if (zonesError) {
    console.error(
      "Erro ao carregar regiões:",
      zonesError
    );

    throw new Error(
      "Não foi possível carregar as regiões de entrega."
    );
  }

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
            Sistema
          </p>

          <h1 className="mt-2 text-3xl font-bold text-brand-foreground">
            Configurações
          </h1>

          <p className="mt-2 text-sm text-brand-muted-foreground">
            Gerencie os dados gerais da{" "}
            {installation.identity.shortName} e o funcionamento
            do cardápio.
          </p>
        </div>

        {access.role === "admin" && (
          <AdminAccountsManager
            accounts={accounts}
            currentUserId={access.user.id}
          />
        )}

        {/* ======================================
            DADOS DA LOJA
        ====================================== */}

        <section className="mt-8 rounded-3xl border border-brand-border bg-white shadow-sm">
          <div className="border-b border-brand-border p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <Settings size={20} />
              </div>

              <div>
                <h2 className="font-bold text-brand-foreground">
                  Dados da {installation.identity.shortName}
                </h2>

                <p className="text-xs text-brand-muted-foreground">
                  Informações usadas no
                  cardápio e atendimento.
                </p>
              </div>
            </div>
          </div>

          <form
            action={updateStoreSettings}
            className="p-5 sm:p-6"
          >
            <input
              type="hidden"
              name="id"
              value={settings.id}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-brand-foreground">
                  Nome da loja
                </label>

                <input
                  name="store_name"
                  type="text"
                  required
                  defaultValue={
                    settings.store_name
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CB] px-4 text-sm outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-brand-foreground">
                  WhatsApp
                </label>

                <div className="relative mt-2">
                  <MessageCircle
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary"
                  />

                  <input
                    name="whatsapp"
                    type="text"
                    required
                    defaultValue={
                      settings.whatsapp
                    }
                    className="h-12 w-full rounded-xl border border-[#DDD3CB] pl-11 pr-4 text-sm outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-brand-foreground">
                  Instagram
                </label>

                <div className="relative mt-2">
                  <AtSign
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary"
                  />

                  <input
                    name="instagram"
                    type="text"
                    defaultValue={
                      settings.instagram ??
                      ""
                    }
                    className="h-12 w-full rounded-xl border border-[#DDD3CB] pl-11 pr-4 text-sm outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            </div>

            {/* ENDEREÇO */}

            <div className="mt-7">
              <div className="flex items-center gap-2">
                <MapPin
                  size={18}
                  className="text-brand-primary"
                />

                <p className="font-bold text-brand-foreground">
                  Endereço para retirada
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  name="address_street"
                  type="text"
                  placeholder="Rua"
                  defaultValue={
                    settings.address_street ??
                    ""
                  }
                  className="h-12 rounded-xl border border-[#DDD3CB] px-4 text-sm outline-none focus:border-brand-primary sm:col-span-2"
                />

                <input
                  name="address_number"
                  type="text"
                  placeholder="Número"
                  defaultValue={
                    settings.address_number ??
                    ""
                  }
                  className="h-12 rounded-xl border border-[#DDD3CB] px-4 text-sm outline-none focus:border-brand-primary"
                />

                <input
                  name="address_city"
                  type="text"
                  placeholder="Cidade"
                  defaultValue={
                    settings.address_city ??
                    ""
                  }
                  className="h-12 rounded-xl border border-[#DDD3CB] px-4 text-sm outline-none focus:border-brand-primary"
                />

                <input
                  name="address_state"
                  type="text"
                  placeholder="Estado"
                  defaultValue={
                    settings.address_state ??
                    ""
                  }
                  className="h-12 rounded-xl border border-[#DDD3CB] px-4 text-sm outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            {/* RECEBIMENTO */}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-brand-border p-4">
                <input
                  type="checkbox"
                  name="pickup_enabled"
                  defaultChecked={
                    settings.pickup_enabled
                  }
                  className="h-4 w-4 accent-brand-primary"
                />

                <ShoppingBag
                  size={20}
                  className="text-brand-primary"
                />

                <div>
                  <p className="text-sm font-bold text-brand-foreground">
                    Retirada no local
                  </p>

                  <p className="text-xs text-brand-muted-foreground">
                    Permitir retirada na
                    confeitaria.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-brand-border p-4">
                <input
                  type="checkbox"
                  name="delivery_enabled"
                  defaultChecked={
                    settings.delivery_enabled
                  }
                  className="h-4 w-4 accent-brand-primary"
                />

                <Truck
                  size={20}
                  className="text-brand-primary"
                />

                <div>
                  <p className="text-sm font-bold text-brand-foreground">
                    Entrega
                  </p>

                  <p className="text-xs text-brand-muted-foreground">
                    Permitir pedidos com
                    entrega.
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-brand-primary-foreground hover:bg-brand-primary-hover"
              >
                Salvar dados da loja
              </button>
            </div>
          </form>
        </section>

        {/* ======================================
            HORÁRIOS
        ====================================== */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
          <div className="border-b border-brand-border p-5">
            <div className="flex items-center gap-3">
              <Clock3
                size={20}
                className="text-brand-primary"
              />

              <div>
                <h2 className="font-bold text-brand-foreground">
                  Horários de funcionamento
                </h2>

                <p className="text-xs text-brand-muted-foreground">
                  Defina os dias e horários
                  de atendimento.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-brand-border">
            {businessHours?.map(
              (day) => (
                <form
                  key={day.id}
                  action={
                    updateBusinessHours
                  }
                  className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <input
                    type="hidden"
                    name="weekday"
                    value={
                      day.weekday
                    }
                  />

                  <div className="min-w-[170px]">
                    <p className="font-bold text-brand-foreground">
                      {
                        weekdayLabels[
                          day.weekday
                        ]
                      }
                    </p>

                    <p className="text-xs text-brand-muted-foreground">
                      {day.is_open
                        ? "Aberto"
                        : "Fechado"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
                    <label className="col-span-2 flex h-11 items-center gap-2 rounded-xl border border-brand-border px-3 sm:col-span-1">
                      <input
                        type="checkbox"
                        name="is_open"
                        defaultChecked={day.is_open}
                        className="accent-brand-primary"
                      />

                      Aberto
                    </label>

                    <input
                      name="opens_at"
                      type="time"
                      defaultValue={normalizeTime(
                        day.opens_at
                      )}
                      className="h-11 min-w-0 rounded-xl border border-[#DDD3CB] px-3"
                    />

                    <input
                      name="closes_at"
                      type="time"
                      defaultValue={normalizeTime(
                        day.closes_at
                      )}
                      className="h-11 min-w-0 rounded-xl border border-[#DDD3CB] px-3"
                    />

                    <button
                      type="submit"
                      className="col-span-2 h-11 rounded-xl border border-brand-primary px-4 text-sm font-bold text-brand-primary sm:col-span-1"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              )
            )}
          </div>
        </section>

        {/* ======================================
            REGIÕES DE ENTREGA
        ====================================== */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
          <div className="border-b border-brand-border p-5">
            <div className="flex items-center gap-3">
              <Truck
                size={20}
                className="text-brand-primary"
              />

              <div>
                <h2 className="font-bold text-brand-foreground">
                  Regiões de entrega
                </h2>

                <p className="text-xs text-brand-muted-foreground">
                  Configure onde a {installation.identity.shortName} realiza entregas.
                </p>
              </div>
            </div>
          </div>

          {/* NOVA REGIÃO */}

          <form
            action={createDeliveryZone}
            className="grid gap-3 border-b border-brand-border bg-brand-background p-5 lg:grid-cols-[1fr_220px_180px_auto]"
          >
            <input
              name="neighborhood"
              type="text"
              required
              placeholder="Cidade ou região"
              className="h-11 rounded-xl border border-[#DDD3CB] px-4 text-sm outline-none focus:border-brand-primary"
            />

            <select
              name="fee_type"
              defaultValue="consult"
              className="h-11 rounded-xl border border-[#DDD3CB] px-3 text-sm"
            >
              <option value="consult">
                Consultar taxa
              </option>

              <option value="fixed">
                Taxa fixa
              </option>
            </select>

            <input
              name="delivery_fee"
              type="number"
              min="0"
              step="0.01"
              placeholder="Valor, se fixa"
              className="h-11 rounded-xl border border-[#DDD3CB] px-4 text-sm"
            />

            <button
              type="submit"
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-bold text-brand-primary-foreground"
            >
              <Plus size={17} />
              Adicionar
            </button>
          </form>

          {/* LISTA */}

          {deliveryZones &&
          deliveryZones.length > 0 ? (
            <div className="divide-y divide-brand-border">
              {deliveryZones.map(
                (zone) => (
                  <div
                    key={`${zone.id}-${zone.fee_type}-${zone.delivery_fee ?? "null"}-${zone.active}`}
                    className="p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-brand-foreground">
                            {
                              zone.neighborhood
                            }
                          </p>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              zone.active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {zone.active
                              ? "Ativa"
                              : "Inativa"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-semibold text-brand-primary">
                          {zone.fee_type ===
                          "consult"
                            ? "Consultar taxa"
                            : formatCurrency(
                                Number(
                                  zone.delivery_fee ??
                                    0
                                )
                              )}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 lg:flex-row">
                        {/* EDITAR */}

                        <form
                          action={
                            updateDeliveryZone
                          }
                          className="flex flex-col gap-2 sm:flex-row"
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={
                              zone.id
                            }
                          />

                          <input
                            name="neighborhood"
                            type="text"
                            defaultValue={
                              zone.neighborhood
                            }
                            className="h-10 rounded-lg border border-[#DDD3CB] px-3 text-sm"
                          />

                          <select
                            name="fee_type"
                            defaultValue={
                              zone.fee_type
                            }
                            className="h-10 rounded-lg border border-[#DDD3CB] px-3 text-sm"
                          >
                            <option value="consult">
                              Consultar
                            </option>

                            <option value="fixed">
                              Taxa fixa
                            </option>
                          </select>

                          <input
                            name="delivery_fee"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={
                              zone.delivery_fee ??
                              ""
                            }
                            placeholder="R$"
                            className="h-10 w-full rounded-lg border border-[#DDD3CB] px-3 text-sm sm:w-28"
                          />

                          <button
                            type="submit"
                            className="h-10 rounded-lg border border-brand-primary px-4 text-sm font-bold text-brand-primary"
                          >
                            Salvar
                          </button>
                        </form>

                      <div className="flex items-center gap-2">
                        {/* ATIVAR */}

                        <form
                          action={
                            toggleDeliveryZone
                          }
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={
                              zone.id
                            }
                          />

                          <input
                            type="hidden"
                            name="active"
                            value={String(
                              zone.active
                            )}
                          />

                          <button
                            type="submit"
                            className="h-10 rounded-lg border border-brand-border px-4 text-sm font-bold text-brand-primary"
                          >
                            {zone.active
                              ? "Desativar"
                              : "Ativar"}
                          </button>
                        </form>
        
                        {/* EXCLUIR */}

                        <form
                          action={
                            deleteDeliveryZone
                          }
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={
                              zone.id
                            }
                          />

                          <button
                            type="submit"
                            title="Excluir região"
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </form>
                      </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-brand-muted-foreground">
              Nenhuma região de entrega
              cadastrada.
            </div>
          )}
        </section>

        {access.role === "admin" && (
          <MonitoringTestCard />
        )}
      </div>
    </main>
  );
}
