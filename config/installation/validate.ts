import {
  INSTALLATION_PROFILE_SCHEMA_VERSION,
  foodBusinessSegments,
  installationModuleKeys,
  schemaOrgTypes,
  type InstallationProfile,
} from "@/config/installation/types";

export type InstallationProfileValidation = {
  valid: boolean;
  errors: string[];
};

const requiredStringPaths = [
  "preset.id",
  "identity.name",
  "identity.shortName",
  "identity.slug",
  "identity.businessSegment",
  "identity.assets.logos.default",
  "identity.assets.logos.onPrimary",
  "identity.assets.icon",
  "identity.assets.brandIcons.default",
  "identity.assets.brandIcons.onPrimary",
  "identity.assets.monograms.default",
  "identity.assets.monograms.onPrimary",
  "contact.whatsapp",
  "address.street",
  "address.number",
  "address.city",
  "address.state",
  "address.country",
  "regionalization.locale",
  "regionalization.currency",
  "regionalization.timeZone",
  "seo.title",
  "seo.titleTemplate",
  "seo.description",
  "seo.siteName",
  "seo.schemaOrgType",
  "seo.manifestDescription",
  "seo.openGraph.locale",
  "seo.openGraph.title",
  "seo.openGraph.description",
  "seo.openGraph.image.alt",
  "seo.openGraph.image.eyebrow",
  "seo.openGraph.image.description",
  "seo.twitter.title",
  "seo.twitter.description",
  "publicContent.hero.eyebrow",
  "publicContent.hero.title",
  "publicContent.hero.description",
  "publicContent.fulfillment.pickupAndDelivery.title",
  "publicContent.fulfillment.pickupAndDelivery.description",
  "publicContent.fulfillment.pickupOnly.title",
  "publicContent.fulfillment.pickupOnly.description",
  "publicContent.fulfillment.deliveryOnly.title",
  "publicContent.fulfillment.deliveryOnly.description",
  "publicContent.fulfillment.unavailable.title",
  "publicContent.fulfillment.unavailable.description",
  "publicContent.preorders.banner.eyebrow",
  "publicContent.preorders.banner.title",
  "publicContent.preorders.banner.description",
  "publicContent.preorders.banner.ctaLabel",
  "publicContent.preorders.categoryShortcut.eyebrow",
  "publicContent.preorders.categoryShortcut.title",
  "publicContent.preorders.categoryShortcut.description",
  "legal.controllerName",
  "legal.locality.city",
  "legal.locality.state",
  "legal.locality.country",
  "legal.privacyNoticePath",
  "legal.privacyNoticeLastUpdated",
] as const;

const themeColorKeys = [
  "primary",
  "onPrimary",
  "primaryHover",
  "accent",
  "background",
  "surface",
  "mutedSurface",
  "text",
  "mutedText",
  "border",
] as const;

const assetPaths = [
  "identity.assets.logos.default",
  "identity.assets.logos.onPrimary",
  "identity.assets.icon",
  "identity.assets.brandIcons.default",
  "identity.assets.brandIcons.onPrimary",
  "identity.assets.monograms.default",
  "identity.assets.monograms.onPrimary",
] as const;

const nullableStringPaths = [
  "identity.slogan",
  "contact.instagram",
  "contact.email",
  "contact.phone",
  "address.complement",
  "address.neighborhood",
  "address.postalCode",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getValue(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[key];
  }, value);
}

function isValidAssetPath(value: string) {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("..")) {
    return true;
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isValidLocale(value: string) {
  try {
    return Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
}

function isValidCurrency(locale: string, currency: string) {
  if (!/^[A-Z]{3}$/.test(currency)) {
    return false;
  }

  try {
    new Intl.NumberFormat(locale, { style: "currency", currency });
    return true;
  } catch {
    return false;
  }
}

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function validateInstallationProfile(
  profile: unknown
): InstallationProfileValidation {
  const errors: string[] = [];

  if (!isRecord(profile)) {
    return { valid: false, errors: ["O perfil deve ser um objeto."] };
  }

  if (profile.schemaVersion !== INSTALLATION_PROFILE_SCHEMA_VERSION) {
    errors.push(
      `schemaVersion deve ser ${INSTALLATION_PROFILE_SCHEMA_VERSION}.`
    );
  }

  const presetVersion = getValue(profile, "preset.version");
  if (!Number.isInteger(presetVersion) || Number(presetVersion) < 1) {
    errors.push("preset.version deve ser um inteiro positivo.");
  }

  for (const path of requiredStringPaths) {
    const value = getValue(profile, path);
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`${path} é obrigatório.`);
    }
  }

  for (const path of nullableStringPaths) {
    const value = getValue(profile, path);
    if (value !== null && (typeof value !== "string" || !value.trim())) {
      errors.push(`${path} deve ser nulo ou um texto não vazio.`);
    }
  }

  const presetId = getValue(profile, "preset.id");
  if (
    typeof presetId === "string" &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(presetId)
  ) {
    errors.push("preset.id deve usar letras minúsculas, números e hífens.");
  }

  const slug = getValue(profile, "identity.slug");
  if (typeof slug === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push("identity.slug deve usar letras minúsculas, números e hífens.");
  }

  const businessSegment = getValue(profile, "identity.businessSegment");
  if (
    typeof businessSegment !== "string" ||
    !foodBusinessSegments.includes(
      businessSegment as (typeof foodBusinessSegments)[number]
    )
  ) {
    errors.push("identity.businessSegment não é reconhecido.");
  }

  for (const key of themeColorKeys) {
    const color = getValue(profile, `theme.${key}`);
    if (typeof color !== "string" || !/^#[0-9A-F]{6}$/i.test(color)) {
      errors.push(`theme.${key} deve ser uma cor hexadecimal com 6 dígitos.`);
    }
  }

  for (const path of assetPaths) {
    const asset = getValue(profile, path);
    if (typeof asset !== "string" || !isValidAssetPath(asset)) {
      errors.push(`${path} deve ser um caminho público ou uma URL HTTPS.`);
    }
  }

  const whatsapp = getValue(profile, "contact.whatsapp");
  if (typeof whatsapp === "string" && !/^\d{10,15}$/.test(whatsapp)) {
    errors.push("contact.whatsapp deve conter somente 10 a 15 dígitos.");
  }

  const instagram = getValue(profile, "contact.instagram");
  if (
    instagram !== null &&
    (typeof instagram !== "string" || !/^@[A-Za-z0-9._]{1,30}$/.test(instagram))
  ) {
    errors.push("contact.instagram deve ser nulo ou um identificador válido.");
  }

  const email = getValue(profile, "contact.email");
  if (
    email !== null &&
    (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    errors.push("contact.email deve ser nulo ou um e-mail válido.");
  }

  const country = getValue(profile, "address.country");
  if (typeof country === "string" && !/^[A-Z]{2}$/.test(country)) {
    errors.push("address.country deve usar o código ISO de duas letras.");
  }

  const locale = getValue(profile, "regionalization.locale");
  const currency = getValue(profile, "regionalization.currency");
  const timeZone = getValue(profile, "regionalization.timeZone");

  if (typeof locale !== "string" || !isValidLocale(locale)) {
    errors.push("regionalization.locale é inválido.");
  }

  if (
    typeof locale !== "string" ||
    typeof currency !== "string" ||
    !isValidCurrency(locale, currency)
  ) {
    errors.push("regionalization.currency é inválida.");
  }

  if (typeof timeZone !== "string" || !isValidTimeZone(timeZone)) {
    errors.push("regionalization.timeZone é inválido.");
  }

  if (getValue(profile, "seo.openGraph.type") !== "website") {
    errors.push("seo.openGraph.type deve ser website.");
  }

  const schemaOrgType = getValue(profile, "seo.schemaOrgType");
  if (
    typeof schemaOrgType !== "string" ||
    !schemaOrgTypes.includes(
      schemaOrgType as (typeof schemaOrgTypes)[number]
    )
  ) {
    errors.push("seo.schemaOrgType não é reconhecido.");
  }

  const openGraphFooterItems = getValue(
    profile,
    "seo.openGraph.image.footerItems"
  );
  if (
    !Array.isArray(openGraphFooterItems) ||
    openGraphFooterItems.length === 0 ||
    openGraphFooterItems.some(
      (item) => typeof item !== "string" || !item.trim()
    )
  ) {
    errors.push(
      "seo.openGraph.image.footerItems deve conter ao menos um texto válido."
    );
  }

  const twitterCard = getValue(profile, "seo.twitter.card");
  if (twitterCard !== "summary" && twitterCard !== "summary_large_image") {
    errors.push("seo.twitter.card é inválido.");
  }

  const primaryCta = getValue(profile, "publicContent.hero.primaryCta");
  if (primaryCta !== null) {
    if (!isRecord(primaryCta)) {
      errors.push("publicContent.hero.primaryCta deve ser nulo ou um objeto.");
    } else if (
      typeof primaryCta.label !== "string" ||
      !primaryCta.label.trim() ||
      typeof primaryCta.href !== "string" ||
      !isValidAssetPath(primaryCta.href)
    ) {
      errors.push("publicContent.hero.primaryCta é inválido.");
    }
  }

  if (getValue(profile, "legal.contactChannel") !== "whatsapp") {
    errors.push("legal.contactChannel deve ser whatsapp.");
  }

  const privacyNoticePath = getValue(profile, "legal.privacyNoticePath");
  if (
    typeof privacyNoticePath === "string" &&
    !isValidAssetPath(privacyNoticePath)
  ) {
    errors.push("legal.privacyNoticePath deve ser um caminho público válido.");
  }

  const privacyNoticeLastUpdated = getValue(
    profile,
    "legal.privacyNoticeLastUpdated"
  );
  if (
    typeof privacyNoticeLastUpdated === "string" &&
    !/^\d{4}-\d{2}-\d{2}$/.test(privacyNoticeLastUpdated)
  ) {
    errors.push("legal.privacyNoticeLastUpdated deve usar AAAA-MM-DD.");
  }

  const keywords = getValue(profile, "seo.keywords");
  if (
    !Array.isArray(keywords) ||
    keywords.length === 0 ||
    keywords.some((keyword) => typeof keyword !== "string" || !keyword.trim())
  ) {
    errors.push("seo.keywords deve conter ao menos uma palavra-chave válida.");
  }

  const modules = getValue(profile, "modules");
  if (!isRecord(modules)) {
    errors.push("modules é obrigatório.");
  } else {
    const configuredKeys = Object.keys(modules).sort();
    const expectedKeys = [...installationModuleKeys].sort();

    if (configuredKeys.join("|") !== expectedKeys.join("|")) {
      errors.push("modules deve declarar exatamente todos os módulos do contrato.");
    }

    for (const moduleKey of installationModuleKeys) {
      if (typeof modules[moduleKey] !== "boolean") {
        errors.push(`modules.${moduleKey} deve ser booleano.`);
      }
    }

    if (modules.preorderSchedule === true && modules.preorders !== true) {
      errors.push("modules.preorderSchedule depende de modules.preorders.");
    }
  }

  return { valid: errors.length === 0, errors };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }

  return Object.freeze(value);
}

export function defineInstallationProfile<
  const Profile extends InstallationProfile,
>(profile: Profile): Profile {
  const validation = validateInstallationProfile(profile);

  if (!validation.valid) {
    throw new Error(
      `Perfil de instalação inválido:\n- ${validation.errors.join("\n- ")}`
    );
  }

  return deepFreeze(profile);
}
