import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-path";

const PUBLIC_PATHS = new Set([
  "/login",
  "/auth/callback",
  "/redefinir-senha",
  "/manifest.webmanifest",
  "/sw.js",
]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  return false;
}

/** Refreshes the auth session cookie and blocks unauthenticated app pages. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getSupabaseEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;
  const user = data.user;

  if (!isPublicPath(pathname) && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    const next = `${pathname}${search}`;
    if (next && next !== "/") {
      login.searchParams.set("next", next);
    }
    return NextResponse.redirect(login);
  }

  if (pathname === "/login" && user) {
    const dest = request.nextUrl.clone();
    dest.pathname = safeNextPath(request.nextUrl.searchParams.get("next"));
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
