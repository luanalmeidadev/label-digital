export const PLATFORM_DEMO_MANIFEST_SCHEMA_VERSION = 1;

const PLATFORM_MANIFEST_PRESET_SEGMENTS = Object.freeze({
  "demo-burger": Object.freeze(["hamburgueria"]),
});

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTAGRAM_PATTERN = /^@[A-Za-z0-9._]{1,30}$/;

export class PlatformDemoManifestError extends Error {
  constructor(message) {
    super(`Manifesto de demonstração inválido: ${message}`);
    this.name = "PlatformDemoManifestError";
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value, path) {
  if (!isRecord(value)) {
    throw new PlatformDemoManifestError(`${path} deve ser um objeto.`);
  }

  return value;
}

function assertKnownKeys(record, allowedKeys, path) {
  const unknownKeys = Object.keys(record).filter(
    (key) => !allowedKeys.includes(key)
  );

  if (unknownKeys.length > 0) {
    throw new PlatformDemoManifestError(
      `${path} contém campo não permitido: ${unknownKeys.join(", ")}.`
    );
  }
}

function readString(record, key, path, { required = true, maxLength }) {
  const value = record[key];

  if (value === undefined && !required) return undefined;
  if (typeof value !== "string") {
    throw new PlatformDemoManifestError(`${path} deve ser texto.`);
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new PlatformDemoManifestError(`${path} não pode ficar vazio.`);
  }
  if (/[\u0000-\u001F\u007F<>]/.test(trimmedValue)) {
    throw new PlatformDemoManifestError(
      `${path} contém caracteres não permitidos.`
    );
  }
  if (trimmedValue.length > maxLength) {
    throw new PlatformDemoManifestError(
      `${path} deve ter no máximo ${maxLength} caracteres.`
    );
  }

  return trimmedValue;
}

function readOptionalString(record, key, path, maxLength) {
  return readString(record, key, path, {
    required: false,
    maxLength,
  });
}

function assertIsoDate(value, path) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new PlatformDemoManifestError(`${path} deve ser uma data ISO válida.`);
  }

  return timestamp;
}

function normalizeWhatsapp(value) {
  if (value === undefined) return undefined;
  const digits = value.replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(digits)) {
    throw new PlatformDemoManifestError(
      "contact.whatsapp deve conter entre 10 e 15 dígitos."
    );
  }
  return digits;
}

function deepFreeze(value) {
  if (!isRecord(value) || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function parsePlatformDemoManifest(input, options = {}) {
  const manifest = assertRecord(input, "manifesto");
  assertKnownKeys(
    manifest,
    [
      "schemaVersion",
      "generatedAt",
      "business",
      "theme",
      "contact",
      "location",
      "expiresAt",
    ],
    "manifesto"
  );

  if (manifest.schemaVersion !== PLATFORM_DEMO_MANIFEST_SCHEMA_VERSION) {
    throw new PlatformDemoManifestError(
      `schemaVersion deve ser ${PLATFORM_DEMO_MANIFEST_SCHEMA_VERSION}.`
    );
  }

  const generatedAt = readString(manifest, "generatedAt", "generatedAt", {
    maxLength: 64,
  });
  assertIsoDate(generatedAt, "generatedAt");

  const expiresAt = readOptionalString(
    manifest,
    "expiresAt",
    "expiresAt",
    64
  );
  if (expiresAt) {
    const expiration = assertIsoDate(expiresAt, "expiresAt");
    const now = options.now instanceof Date
      ? options.now.getTime()
      : typeof options.now === "number"
        ? options.now
        : options.now
          ? Date.parse(String(options.now))
          : Date.now();

    if (!Number.isFinite(now)) {
      throw new PlatformDemoManifestError(
        "a referência de data usada na validação é inválida."
      );
    }
    if (expiration <= now) {
      throw new PlatformDemoManifestError("o manifesto está expirado.");
    }
  }

  const business = assertRecord(manifest.business, "business");
  assertKnownKeys(
    business,
    ["name", "slug", "segment", "preset"],
    "business"
  );
  const businessName = readString(business, "name", "business.name", {
    maxLength: 120,
  });
  const businessSlug = readString(business, "slug", "business.slug", {
    maxLength: 80,
  });
  const businessSegment = readString(
    business,
    "segment",
    "business.segment",
    { maxLength: 80 }
  );
  const businessPreset = readString(
    business,
    "preset",
    "business.preset",
    { maxLength: 80 }
  );

  if (!SLUG_PATTERN.test(businessSlug)) {
    throw new PlatformDemoManifestError(
      "business.slug deve usar letras minúsculas, números e hífens."
    );
  }

  const allowedSegments = PLATFORM_MANIFEST_PRESET_SEGMENTS[businessPreset];
  if (!allowedSegments) {
    throw new PlatformDemoManifestError(
      `business.preset não é conhecido pelo Core: ${businessPreset}.`
    );
  }
  if (!allowedSegments.includes(businessSegment)) {
    throw new PlatformDemoManifestError(
      `business.segment ${businessSegment} não é compatível com o preset ${businessPreset}.`
    );
  }

  const theme = assertRecord(manifest.theme, "theme");
  assertKnownKeys(theme, ["primary", "secondary"], "theme");
  const primary = readString(theme, "primary", "theme.primary", {
    maxLength: 7,
  }).toUpperCase();
  const secondary = readString(theme, "secondary", "theme.secondary", {
    maxLength: 7,
  }).toUpperCase();
  if (!HEX_COLOR_PATTERN.test(primary)) {
    throw new PlatformDemoManifestError(
      "theme.primary deve ser uma cor hexadecimal com 6 dígitos."
    );
  }
  if (!HEX_COLOR_PATTERN.test(secondary)) {
    throw new PlatformDemoManifestError(
      "theme.secondary deve ser uma cor hexadecimal com 6 dígitos."
    );
  }

  const contact = assertRecord(manifest.contact, "contact");
  assertKnownKeys(contact, ["whatsapp", "email", "instagram"], "contact");
  const whatsapp = normalizeWhatsapp(
    readOptionalString(contact, "whatsapp", "contact.whatsapp", 30)
  );
  const email = readOptionalString(contact, "email", "contact.email", 254);
  const instagram = readOptionalString(
    contact,
    "instagram",
    "contact.instagram",
    31
  );
  if (email && !EMAIL_PATTERN.test(email)) {
    throw new PlatformDemoManifestError("contact.email deve ser válido.");
  }
  if (instagram && !INSTAGRAM_PATTERN.test(instagram)) {
    throw new PlatformDemoManifestError(
      "contact.instagram deve começar com @ e ser um identificador válido."
    );
  }

  const location = assertRecord(manifest.location, "location");
  assertKnownKeys(location, ["address", "city", "state"], "location");
  const address = readOptionalString(
    location,
    "address",
    "location.address",
    200
  );
  const city = readOptionalString(location, "city", "location.city", 100);
  const stateValue = readOptionalString(
    location,
    "state",
    "location.state",
    2
  );
  const state = stateValue?.toUpperCase();
  if (state && !/^[A-Z]{2}$/.test(state)) {
    throw new PlatformDemoManifestError(
      "location.state deve usar uma sigla de UF com 2 letras."
    );
  }

  return deepFreeze({
    schemaVersion: PLATFORM_DEMO_MANIFEST_SCHEMA_VERSION,
    generatedAt,
    ...(expiresAt ? { expiresAt } : {}),
    business: {
      name: businessName,
      slug: businessSlug,
      segment: businessSegment,
      preset: businessPreset,
    },
    theme: { primary, secondary },
    contact: {
      ...(whatsapp ? { whatsapp } : {}),
      ...(email ? { email } : {}),
      ...(instagram ? { instagram } : {}),
    },
    location: {
      ...(address ? { address } : {}),
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
    },
  });
}

export function parsePlatformDemoManifestJson(serialized, options = {}) {
  if (typeof serialized !== "string" || !serialized.trim()) {
    throw new PlatformDemoManifestError("o conteúdo JSON está vazio.");
  }

  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new PlatformDemoManifestError("o arquivo não contém JSON válido.");
  }

  return parsePlatformDemoManifest(parsed, options);
}
