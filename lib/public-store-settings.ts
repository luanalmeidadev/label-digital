import "server-only";

import { storeConfig } from "@/config/store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PublicBusinessHour = {
  weekday: number;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

export type PublicStoreSettings = {
  storeName: string;
  whatsapp: string;
  instagram: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pickupAddress: string;
  address: {
    street: string;
    number: string;
    city: string;
    state: string;
  };
  deliveryCities: string[];
  businessHours: PublicBusinessHour[];
};

const fallbackBusinessHours: PublicBusinessHour[] = [
  { weekday: 0, isOpen: false, opensAt: null, closesAt: null },
  { weekday: 1, isOpen: false, opensAt: null, closesAt: null },
  { weekday: 2, isOpen: true, opensAt: "09:00", closesAt: "19:00" },
  { weekday: 3, isOpen: true, opensAt: "09:00", closesAt: "19:00" },
  { weekday: 4, isOpen: true, opensAt: "09:00", closesAt: "19:00" },
  { weekday: 5, isOpen: true, opensAt: "09:00", closesAt: "19:00" },
  { weekday: 6, isOpen: true, opensAt: "09:00", closesAt: "17:00" },
];

function resolveAddress(settings?: {
  address_street: string | null;
  address_number: string | null;
  address_city: string | null;
  address_state: string | null;
}) {
  const street =
    settings?.address_street?.trim() || storeConfig.address.street;
  const number =
    settings?.address_number?.trim() || storeConfig.address.number;
  const city =
    settings?.address_city?.trim() || storeConfig.address.city;
  const state =
    settings?.address_state?.trim() || storeConfig.address.state;

  return { street, number, city, state };
}

export async function getPublicStoreSettings(): Promise<PublicStoreSettings> {
  const supabase = createSupabaseAdminClient();

  const [settingsResult, hoursResult, zonesResult] = await Promise.all([
    supabase
      .from("store_settings")
      .select(`
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
      .maybeSingle(),
    supabase
      .from("business_hours")
      .select("weekday, is_open, opens_at, closes_at")
      .order("weekday"),
    supabase
      .from("delivery_zones")
      .select("neighborhood")
      .eq("active", true)
      .order("neighborhood"),
  ]);

  if (settingsResult.error) {
    console.error(
      "Erro ao carregar configurações públicas da loja:",
      settingsResult.error
    );
  }

  if (hoursResult.error) {
    console.error(
      "Erro ao carregar horários públicos da loja:",
      hoursResult.error
    );
  }

  if (zonesResult.error) {
    console.error(
      "Erro ao carregar regiões públicas da loja:",
      zonesResult.error
    );
  }

  const settings = settingsResult.data;
  const address = resolveAddress(settings ?? undefined);
  const businessHours =
    hoursResult.data && hoursResult.data.length > 0
      ? hoursResult.data.map((hour) => ({
          weekday: hour.weekday,
          isOpen: hour.is_open,
          opensAt: hour.opens_at?.slice(0, 5) ?? null,
          closesAt: hour.closes_at?.slice(0, 5) ?? null,
        }))
      : fallbackBusinessHours;
  const deliveryCities =
    zonesResult.error
      ? [...storeConfig.deliveryCities]
      : (zonesResult.data ?? []).map((zone) => zone.neighborhood);

  return {
    storeName: settings?.store_name?.trim() || storeConfig.name,
    whatsapp: settings?.whatsapp?.trim() || storeConfig.whatsapp,
    instagram: settings?.instagram?.trim() || storeConfig.instagram,
    pickupEnabled: settings?.pickup_enabled ?? storeConfig.orderTypes.pickup,
    deliveryEnabled:
      settings?.delivery_enabled ?? storeConfig.orderTypes.delivery,
    pickupAddress: `${address.street}, ${address.number} — ${address.city}/${address.state}`,
    address,
    deliveryCities,
    businessHours,
  };
}
