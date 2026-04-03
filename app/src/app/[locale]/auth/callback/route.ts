import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth_error", origin));
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      return NextResponse.redirect(new URL("/dashboard", origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=oauth_error", origin));
}
