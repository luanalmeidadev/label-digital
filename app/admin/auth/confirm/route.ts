import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedOtpTypes = new Set<EmailOtpType>([
  "invite",
]);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get(
    "token_hash"
  );
  const type = request.nextUrl.searchParams.get(
    "type"
  ) as EmailOtpType | null;
  const destination = request.nextUrl.clone();

  destination.search = "";

  if (
    !tokenHash ||
    !type ||
    !allowedOtpTypes.has(type)
  ) {
    destination.pathname = "/admin/login";
    destination.searchParams.set(
      "error",
      "invalid-link"
    );
    return NextResponse.redirect(destination);
  }

  const supabase =
    await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    destination.pathname = "/admin/login";
    destination.searchParams.set(
      "error",
      "invalid-link"
    );
    return NextResponse.redirect(destination);
  }

  destination.pathname = "/admin/definir-senha";
  return NextResponse.redirect(destination);
}
