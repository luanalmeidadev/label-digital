import * as Sentry from "@sentry/nextjs";
import crypto from "crypto";
import { type NextRequest } from "next/server";

import { preorderStorageBucket } from "@/lib/preorder-catalog-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getHealthCheckKeys } from "@/config/installation/modules";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

const TIMEOUT_MS = 3000;

interface HealthCheckResult {
  error?: unknown;
}

function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms: number, timeoutMsg: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMsg)), ms);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

function safeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(request: NextRequest) {
  const secret = process.env.PLATFORM_HEALTH_SECRET;
  const coreVersion = process.env.CORE_VERSION || "unknown";

  if (!secret) {
    return new Response("Unauthorized", { status: 401, headers: responseHeaders });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401, headers: responseHeaders });
  }

  const token = authHeader.substring(7);
  if (!safeCompare(token, secret)) {
    return new Response("Unauthorized", { status: 401, headers: responseHeaders });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const healthCheckKeys = getHealthCheckKeys();
    
    const checks = healthCheckKeys.map((name) => {
      if (name === "database") {
        return {
          name,
          promise: withTimeout<HealthCheckResult>(
            Promise.resolve(supabase.from("store_settings").select("id").limit(1)),
            TIMEOUT_MS,
            "Database timeout"
          ),
        };
      }

      return {
        name,
        promise: withTimeout<HealthCheckResult>(
          Promise.resolve(supabase.storage
            .from(name === "preorderStorage" ? preorderStorageBucket : "product-images")
            .list("", { limit: 1 })),
          TIMEOUT_MS,
          `Storage timeout (${name})`
        ),
      };
    });

    const results = await Promise.allSettled(
      checks.map(async (check) => {
        const res = await check.promise;
        // Supabase returns { data, error } object
        if (res?.error) {
          throw res.error; // triggers rejected state
        }
        return { name: check.name, status: "ok" };
      })
    );

    const checksOutput: Record<string, "ok" | "failed"> = {};
    const failedNames: string[] = [];

    results.forEach((result, index) => {
      const name = checks[index].name;
      if (result.status === "fulfilled") {
        checksOutput[name] = "ok";
      } else {
        checksOutput[name] = "failed";
        failedNames.push(name);
      }
    });

    if (failedNames.length > 0) {
      console.error("Falha na verificação de saúde:", failedNames);

      Sentry.captureMessage("Verificação de saúde degradada", {
        level: "error",
        tags: { area: "health-check" },
        fingerprint: ["health-check-degraded"],
        contexts: { checks: checksOutput },
      });
      await Sentry.flush(1500);

      return Response.json(
        { status: "degraded", coreVersion, checks: checksOutput },
        { status: 503, headers: responseHeaders }
      );
    }

    return Response.json(
      { status: "ok", coreVersion, checks: checksOutput },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("Erro fatal na verificação de saúde. A exceção original foi enviada ao Sentry.");

    Sentry.captureException(error, {
      tags: { area: "health-check" },
    });
    await Sentry.flush(1500);

    // Na falha fatal, não sabemos o status específico dos checks, então marcamos genericamente como failed
    // No entanto, é melhor tentar reportar quais falharam se soubermos, mas como foi erro fatal:
    const fallbackChecks: Record<string, "failed"> = {};
    getHealthCheckKeys().forEach(k => { fallbackChecks[k] = "failed"; });

    return Response.json(
      { status: "degraded", coreVersion, checks: fallbackChecks },
      { status: 503, headers: responseHeaders }
    );
  }
}
