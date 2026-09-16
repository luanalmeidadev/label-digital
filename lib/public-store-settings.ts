import "server-only";

import { getPublicInstallationProfile } from "@/config/installation/public";
import type { PublicInstallationProfile } from "@/config/installation/types";
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
  whatsapp: string | null;
  instagram: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pickupAddress: string;
  address: {
    street: string | null;
    number: string | null;
    city: string | null;
    state: string | null;
  };
  deliveryCities: string[];
  deliveryZones: {
    neighborhood: string;
    delivery_fee: number;
    fee_type: "fixed" | "consult";
  }[];
  businessHours: PublicBusinessHour[];
  isDemo?: boolean;
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

function buildPresetStoreSettings(
  installation: PublicInstallationProfile
): PublicStoreSettings {
  const { address, contact, identity, modules } = installation;

  return {
    storeName: identity.name,
    whatsapp: contact.whatsapp,
    instagram: contact.instagram,
    pickupEnabled: modules.pickup,
    deliveryEnabled: modules.delivery,
    pickupAddress: address.street ? `${address.street}, ${address.number} — ${address.city}/${address.state}` : "",
    address: {
      street: address.street,
      number: address.number,
      city: address.city,
      state: address.state,
    },
    deliveryCities: [...storeConfig.deliveryCities],
    deliveryZones: storeConfig.deliveryCities.map((city) => ({
      neighborhood: city,
      delivery_fee: 0,
      fee_type: "consult",
    })),
    businessHours: fallbackBusinessHours,
    isDemo: true,
  };
}

function resolveAddress(
  fallback: PublicStoreSettings["address"],
  settings?: {
    address_street: string | null;
    address_number: string | null;
    address_city: string | null;
    address_state: string | null;
  }
) {
  const street =
    settings?.address_street?.trim() || fallback.street;
  const number =
    settings?.address_number?.trim() || fallback.number;
  const city =
    settings?.address_city?.trim() || fallback.city;
  const state =
    settings?.address_state?.trim() || fallback.state;

  return { street, number, city, state };
}

export async function getPublicStoreSettings(): Promise<PublicStoreSettings> {
  const installation = getPublicInstallationProfile();
  const presetFallback = buildPresetStoreSettings(installation);

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
      .select("neighborhood, delivery_fee, fee_type")
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

  if (!settingsResult.data && installation.preset.id !== "label") {
    return presetFallback;
  }

  const settings = settingsResult.data;
  const address = resolveAddress(presetFallback.address, settings ?? undefined);
  const businessHours =
    hoursResult.data && hoursResult.data.length > 0
      ? hoursResult.data.map((hour) => ({
          weekday: hour.weekday,
          isOpen: hour.is_open,
          opensAt: hour.opens_at?.slice(0, 5) ?? null,
          closesAt: hour.closes_at?.slice(0, 5) ?? null,
        }))
      : presetFallback.businessHours;
  const deliveryCities =
    zonesResult.error || !zonesResult.data || zonesResult.data.length === 0
      ? presetFallback.deliveryCities
      : zonesResult.data.map((zone) => zone.neighborhood);

  const deliveryZones =
    zonesResult.error || !zonesResult.data || zonesResult.data.length === 0
      ? presetFallback.deliveryZones
      : zonesResult.data.map((zone) => ({
          neighborhood: zone.neighborhood,
          delivery_fee: Number(zone.delivery_fee) || 0,
          fee_type: (zone.fee_type as "fixed" | "consult") ?? "consult",
        }));

  return {
    storeName: settings?.store_name?.trim() || presetFallback.storeName,
    whatsapp: settings?.whatsapp?.trim() || presetFallback.whatsapp,
    instagram: settings?.instagram?.trim() || presetFallback.instagram,
    pickupEnabled: settings?.pickup_enabled ?? presetFallback.pickupEnabled,
    deliveryEnabled:
      settings?.delivery_enabled ?? presetFallback.deliveryEnabled,
    pickupAddress: address.street ? `${address.street}, ${address.number} — ${address.city}/${address.state}` : "",
    address,
    deliveryCities,
    deliveryZones,
    businessHours,
    isDemo: presetFallback.isDemo,
  };
}
