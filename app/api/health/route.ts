import * as Sentry from "@sentry/nextjs";

import { preorderStorageBucket } from "@/lib/preorder-catalog-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const [database, preorderStorage, productStorage] =
      await Promise.all([
        supabase
          .from("store_settings")
          .select("id")
          .limit(1),
        supabase.storage
          .from(preorderStorageBucket)
          .list("", { limit: 1 }),
        supabase.storage
          .from("product-images")
          .list("", { limit: 1 }),
      ]);

    const failures = [
      database.error,
      preorderStorage.error,
      productStorage.error,
    ].filter(Boolean);

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
              database: database.error
                ? "failed"
                : "ok",
              preorderStorage: preorderStorage.error
                ? "failed"
                : "ok",
              productStorage: productStorage.error
                ? "failed"
                : "ok",
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
