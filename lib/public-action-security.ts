import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";

import { preorderStorageBucket } from "@/lib/preorder-catalog-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PublicActionScope =
  | "daily-order"
  | "preorder";

type IdempotencyRecord<T> = {
  state: "pending" | "completed";
  fingerprint: string;
  startedAt: string;
  completedAt?: string;
  result?: T;
};

export type IdempotencyState<T> =
  | { state: "missing" }
  | { state: "pending" }
  | { state: "conflict" }
  | { state: "completed"; result: T };

const securityFolder = "security";
const rateLimitWindowMs = 10 * 60 * 1000;
const phoneLimit = 5;
const ipLimit = 20;
const pendingTimeoutMs = 5 * 60 * 1000;
const developmentTurnstileToken =
  "development-bypass";

function getSecuritySecret() {
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "A proteção das ações públicas não está configurada."
    );
  }

  return secret;
}

function hashValue(value: string) {
  return createHmac(
    "sha256",
    getSecuritySecret()
  )
    .update(value)
    .digest("hex");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isStorageConflict(error: {
  message?: string;
  statusCode?: string | number;
}) {
  const message = String(
    error.message ?? ""
  ).toLowerCase();

  return (
    String(error.statusCode ?? "") === "409" ||
    message.includes("already exists") ||
    message.includes("resource exists") ||
    message.includes("duplicate")
  );
}

function isStorageNotFound(error: {
  message?: string;
  statusCode?: string | number;
}) {
  const message = String(
    error.message ?? ""
  ).toLowerCase();

  return (
    String(error.statusCode ?? "") === "404" ||
    message.includes("not found") ||
    message.includes("not_found")
  );
}

async function getRequestIp() {
  const requestHeaders = await headers();
  const forwarded =
    requestHeaders.get(
      "x-vercel-forwarded-for"
    ) ??
    requestHeaders.get("x-forwarded-for") ??
    requestHeaders.get("x-real-ip") ??
    "unknown";

  return forwarded.split(",")[0]?.trim() ||
    "unknown";
}

function getIdempotencyPath(
  scope: PublicActionScope,
  key: string
) {
  return `${securityFolder}/idempotency/${scope}/${key}.json`;
}

async function uploadJson(
  path: string,
  value: unknown,
  upsert: boolean
) {
  const supabase =
    createSupabaseAdminClient();
  const body = new Blob(
    [JSON.stringify(value)],
    { type: "application/json" }
  );

  return supabase.storage
    .from(preorderStorageBucket)
    .upload(path, body, {
      contentType: "application/json",
      cacheControl: "0",
      upsert,
    });
}

export function createActionFingerprint(
  value: unknown
) {
  return hashValue(JSON.stringify(value));
}

export function validateIdempotencyKey(
  value: string
) {
  return isUuid(value);
}

export async function inspectIdempotentRequest<T>(
  scope: PublicActionScope,
  key: string,
  fingerprint: string
): Promise<IdempotencyState<T>> {
  if (!isUuid(key)) {
    return { state: "conflict" };
  }

  const supabase =
    createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(preorderStorageBucket)
    .download(getIdempotencyPath(scope, key));

  if (error) {
    if (isStorageNotFound(error)) {
      return { state: "missing" };
    }

    throw new Error(
      "Não foi possível verificar esta solicitação."
    );
  }

  try {
    const record = JSON.parse(
      await data.text()
    ) as IdempotencyRecord<T>;

    if (record.fingerprint !== fingerprint) {
      return { state: "conflict" };
    }

    if (
      record.state === "completed" &&
      record.result !== undefined
    ) {
      return {
        state: "completed",
        result: record.result,
      };
    }

    const startedAt = Date.parse(
      record.startedAt
    );

    if (
      Number.isFinite(startedAt) &&
      Date.now() - startedAt < pendingTimeoutMs
    ) {
      return { state: "pending" };
    }

    await releaseIdempotentRequest(scope, key);
    return { state: "missing" };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        "Não foi possível validar esta solicitação."
      );
    }

    throw error;
  }
}

export async function beginIdempotentRequest<T>(
  scope: PublicActionScope,
  key: string,
  fingerprint: string
): Promise<IdempotencyState<T>> {
  const record: IdempotencyRecord<T> = {
    state: "pending",
    fingerprint,
    startedAt: new Date().toISOString(),
  };
  const { error } = await uploadJson(
    getIdempotencyPath(scope, key),
    record,
    false
  );

  if (!error) {
    return { state: "missing" };
  }

  if (isStorageConflict(error)) {
    return inspectIdempotentRequest<T>(
      scope,
      key,
      fingerprint
    );
  }

  throw new Error(
    "Não foi possível proteger esta solicitação."
  );
}

export async function completeIdempotentRequest<T>(
  scope: PublicActionScope,
  key: string,
  fingerprint: string,
  result: T
) {
  const record: IdempotencyRecord<T> = {
    state: "completed",
    fingerprint,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    result,
  };
  const { error } = await uploadJson(
    getIdempotencyPath(scope, key),
    record,
    true
  );

  if (error) {
    console.error(
      "Erro ao concluir proteção contra duplicidade:",
      error
    );
  }
}

export async function releaseIdempotentRequest(
  scope: PublicActionScope,
  key: string
) {
  const supabase =
    createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(preorderStorageBucket)
    .remove([getIdempotencyPath(scope, key)]);

  if (error && !isStorageNotFound(error)) {
    console.error(
      "Erro ao liberar proteção contra duplicidade:",
      error
    );
  }
}

async function reserveRateLimitSlot(
  dimension: "phone" | "ip",
  identifier: string,
  limit: number
) {
  const windowId = Math.floor(
    Date.now() / rateLimitWindowMs
  ).toString(36);
  const identifierHash = hashValue(
    `${dimension}:${identifier}`
  );
  const basePath = `${securityFolder}/rate-limits/public-orders/${dimension}/${identifierHash}/${windowId}`;

  for (let slot = 1; slot <= limit; slot += 1) {
    const { error } = await uploadJson(
      `${basePath}/${slot}.json`,
      { reservedAt: new Date().toISOString() },
      false
    );

    if (!error) {
      return true;
    }

    if (!isStorageConflict(error)) {
      throw new Error(
        "Não foi possível verificar o limite de solicitações."
      );
    }
  }

  return false;
}

export async function enforcePublicOrderRateLimit(
  phone: string
) {
  const ip = await getRequestIp();
  const phoneAllowed =
    await reserveRateLimitSlot(
      "phone",
      phone,
      phoneLimit
    );

  if (!phoneAllowed) {
    return {
      success: false as const,
      error:
        "Muitas solicitações foram feitas para este WhatsApp. Aguarde 10 minutos e tente novamente.",
    };
  }

  const ipAllowed =
    await reserveRateLimitSlot(
      "ip",
      ip,
      ipLimit
    );

  if (!ipAllowed) {
    return {
      success: false as const,
      error:
        "Muitas solicitações foram feitas por esta conexão. Aguarde 10 minutos e tente novamente.",
    };
  }

  return {
    success: true as const,
    ip,
  };
}

type TurnstileResponse = {
  success?: boolean;
  action?: string;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(
  token: string,
  expectedAction: "daily_order" | "preorder",
  remoteIp: string
) {
  if (process.env.NODE_ENV !== "production") {
    if (token === developmentTurnstileToken) {
      return { success: true as const };
    }

    return {
      success: false as const,
      error:
        "Confirme a verificação de segurança.",
    };
  }

  const secret =
    process.env.TURNSTILE_SECRET_KEY ?? "";

  if (!secret) {
    return {
      success: false as const,
      error:
        "A verificação de segurança ainda não está configurada.",
    };
  }

  if (!token || token.length > 2048) {
    return {
      success: false as const,
      error:
        "Confirme a verificação de segurança.",
    };
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret,
          response: token,
          remoteip: remoteIp,
          idempotency_key: crypto.randomUUID(),
        }),
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      }
    );
    const result =
      (await response.json()) as TurnstileResponse;

    if (
      !response.ok ||
      !result.success ||
      (result.action &&
        result.action !== expectedAction)
    ) {
      return {
        success: false as const,
        error:
          "A verificação de segurança expirou ou não foi aceita. Tente novamente.",
      };
    }

    return { success: true as const };
  } catch (error) {
    console.error(
      "Erro ao validar Turnstile:",
      error
    );

    return {
      success: false as const,
      error:
        "Não foi possível concluir a verificação de segurança. Tente novamente.",
    };
  }
}
