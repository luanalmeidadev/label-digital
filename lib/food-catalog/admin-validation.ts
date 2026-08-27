import {
  catalogPricingModes,
  optionPresentationModes,
  optionSelectionModes,
  type CatalogPricingMode,
  type OptionPresentationMode,
  type OptionSelectionMode,
} from "@/lib/food-catalog/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PRICE = 99_999_999.99;
const MAX_SELECTIONS = 50;

export class CatalogAdminValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogAdminValidationError";
  }
}

export type CatalogVariantInput = {
  productId: string;
  variantId: string | null;
  name: string;
  price: number;
  active: boolean;
  available: boolean;
};

export type CatalogOptionGroupInput = {
  productId: string;
  optionGroupId: string | null;
  name: string;
  selectionMode: OptionSelectionMode;
  minSelections: number;
  maxSelections: number | null;
  presentationMode: OptionPresentationMode;
  active: boolean;
};

export type CatalogOptionInput = {
  productId: string;
  optionGroupId: string;
  optionId: string | null;
  name: string;
  priceDelta: number;
  active: boolean;
  available: boolean;
};

function readString(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

export function parseCatalogIdentifier(value: unknown, label: string) {
  const identifier = String(value ?? "").trim();

  if (!UUID_PATTERN.test(identifier)) {
    throw new CatalogAdminValidationError(`${label} inválido.`);
  }

  return identifier;
}

function parseOptionalIdentifier(value: unknown, label: string) {
  const identifier = String(value ?? "").trim();
  return identifier ? parseCatalogIdentifier(identifier, label) : null;
}

function parseName(value: unknown, label: string) {
  const name = String(value ?? "").trim();

  if (name.length < 1 || name.length > 120) {
    throw new CatalogAdminValidationError(
      `${label} deve ter entre 1 e 120 caracteres.`
    );
  }

  return name;
}

function parseMoney(value: unknown, label: string) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_PRICE) {
    throw new CatalogAdminValidationError(`${label} inválido.`);
  }

  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function parseSelectionLimit(
  value: unknown,
  label: string,
  options: { optional?: boolean } = {}
) {
  const normalized = String(value ?? "").trim();

  if (options.optional && normalized === "") {
    return null;
  }

  const limit = Number(normalized);

  if (
    !Number.isInteger(limit) ||
    limit < 0 ||
    limit > MAX_SELECTIONS
  ) {
    throw new CatalogAdminValidationError(
      `${label} deve ser um número inteiro entre 0 e ${MAX_SELECTIONS}.`
    );
  }

  return limit;
}

function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string
) {
  const normalized = String(value ?? "").trim() as T;

  if (!allowed.includes(normalized)) {
    throw new CatalogAdminValidationError(`${label} inválido.`);
  }

  return normalized;
}

export function parseCatalogPricingMode(
  formData: FormData
): { productId: string; pricingMode: CatalogPricingMode } {
  return {
    productId: parseCatalogIdentifier(
      readString(formData, "product_id"),
      "Produto"
    ),
    pricingMode: parseEnum(
      readString(formData, "pricing_mode"),
      catalogPricingModes,
      "Tipo de preço"
    ),
  };
}

export function parseCatalogVariantInput(
  formData: FormData
): CatalogVariantInput {
  return {
    productId: parseCatalogIdentifier(
      readString(formData, "product_id"),
      "Produto"
    ),
    variantId: parseOptionalIdentifier(
      readString(formData, "variant_id"),
      "Variante"
    ),
    name: parseName(readString(formData, "name"), "Nome da variante"),
    price: parseMoney(readString(formData, "price"), "Preço da variante"),
    active: formData.get("active") === "on",
    available: formData.get("available") === "on",
  };
}

export function parseCatalogOptionGroupInput(
  formData: FormData
): CatalogOptionGroupInput {
  const selectionMode = parseEnum(
    readString(formData, "selection_mode"),
    optionSelectionModes,
    "Tipo de seleção"
  );
  const minSelections = parseSelectionLimit(
    readString(formData, "min_selections"),
    "Mínimo de escolhas"
  ) as number;
  const maxSelections = parseSelectionLimit(
    readString(formData, "max_selections"),
    "Máximo de escolhas",
    { optional: selectionMode === "multiple" }
  );

  if (selectionMode === "single") {
    if (minSelections > 1 || maxSelections !== 1) {
      throw new CatalogAdminValidationError(
        "Seleção única deve permitir no máximo uma escolha."
      );
    }
  } else if (maxSelections !== null && maxSelections < minSelections) {
    throw new CatalogAdminValidationError(
      "O máximo de escolhas não pode ser menor que o mínimo."
    );
  }

  return {
    productId: parseCatalogIdentifier(
      readString(formData, "product_id"),
      "Produto"
    ),
    optionGroupId: parseOptionalIdentifier(
      readString(formData, "option_group_id"),
      "Grupo"
    ),
    name: parseName(readString(formData, "name"), "Nome do grupo"),
    selectionMode,
    minSelections,
    maxSelections,
    presentationMode: parseEnum(
      readString(formData, "presentation_mode"),
      optionPresentationModes,
      "Apresentação"
    ),
    active: formData.get("active") === "on",
  };
}

export function parseCatalogOptionInput(
  formData: FormData
): CatalogOptionInput {
  return {
    productId: parseCatalogIdentifier(
      readString(formData, "product_id"),
      "Produto"
    ),
    optionGroupId: parseCatalogIdentifier(
      readString(formData, "option_group_id"),
      "Grupo"
    ),
    optionId: parseOptionalIdentifier(
      readString(formData, "option_id"),
      "Opção"
    ),
    name: parseName(readString(formData, "name"), "Nome da opção"),
    priceDelta: parseMoney(
      readString(formData, "price_delta"),
      "Acréscimo"
    ),
    active: formData.get("active") === "on",
    available: formData.get("available") === "on",
  };
}

export function parseCatalogMoveInput(formData: FormData) {
  const direction = readString(formData, "direction");

  if (direction !== "up" && direction !== "down") {
    throw new CatalogAdminValidationError("Direção inválida.");
  }

  return {
    productId: parseCatalogIdentifier(
      readString(formData, "product_id"),
      "Produto"
    ),
    entityId: parseCatalogIdentifier(
      readString(formData, "entity_id"),
      "Item"
    ),
    optionGroupId: parseOptionalIdentifier(
      readString(formData, "option_group_id"),
      "Grupo"
    ),
    direction,
  } as const;
}

export function parseCatalogDeleteInput(formData: FormData) {
  return {
    productId: parseCatalogIdentifier(
      readString(formData, "product_id"),
      "Produto"
    ),
    entityId: parseCatalogIdentifier(
      readString(formData, "entity_id"),
      "Item"
    ),
    optionGroupId: parseOptionalIdentifier(
      readString(formData, "option_group_id"),
      "Grupo"
    ),
  };
}
