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

    return Response.json(
      { status: "degraded" },
      {
        status: 503,
        headers: responseHeaders,
      }
    );
  }
}
