import * as Sentry from "@sentry/nextjs";

import { preorderStorageBucket } from "@/lib/preorder-catalog-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getHealthCheckKeys } from "@/config/installation/modules";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const healthCheckKeys = getHealthCheckKeys();
    const checks = healthCheckKeys.map((name) => {
      if (name === "database") {
        return {
          name,
          promise: supabase
          .from("store_settings")
          .select("id")
          .limit(1),
        };
      }

      return {
        name,
        promise: supabase.storage
          .from(
            name === "preorderStorage"
              ? preorderStorageBucket
              : "product-images"
          )
          .list("", { limit: 1 }),
      };
    });
    const results = await Promise.all(
      checks.map(async (check) => ({
        name: check.name,
        result: await check.promise,
      }))
    );

    const failures = results.filter(({ result }) => result.error);

    if (failures.length > 0) {
      console.error(
        "Falha na verificação de saúde:",
        failures
      );

      Sentry.captureMessage(
        "Verificação de saúde degradada",
        {
          level: "error",
          tags: {
            area: "health-check",
          },
          fingerprint: ["health-check-degraded"],
          contexts: {
            checks: {
              ...Object.fromEntries(
                results.map(({ name, result }) => [
                  name,
                  result.error ? "failed" : "ok",
                ])
              ),
            },
          },
        }
      );
      await Sentry.flush(1500);

      return Response.json(
        { status: "degraded" },
        {
          status: 503,
          headers: responseHeaders,
        }
      );
    }

    return Response.json(
      { status: "ok" },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error(
      "Erro na verificação de saúde:",
      error
    );

    Sentry.captureException(error, {
      tags: {
        area: "health-check",
      },
    });
    await Sentry.flush(1500);

    return Response.json(
      { status: "degraded" },
      {
        status: 503,
        headers: responseHeaders,
      }
    );
  }
}
