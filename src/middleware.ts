import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-user-facing paths
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/monitoring") ||
    pathname.startsWith("/auth/callback")
  ) {
    return NextResponse.next();
  }

  // Run next-intl locale negotiation first
  const intlResponse = intlMiddleware(request);

  // Set up Supabase client for auth on the intl response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies
            .getAll()
            .map((c) => ({ name: c.name, value: c.value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            intlResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { session } } = await supabase.auth.getSession();
  let user = session?.user ?? null;

  if (!user) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  // Extract locale from path for locale-aware redirects
  const localeMatch = pathname.match(/^\/(en|vi)/);
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;

  // Check if this is an auth page
  const isAuthPage =
    pathname.includes("/sign-in") || pathname.includes("/sign-up");

  // Logged-in user visiting auth pages → redirect to locale dashboard
  if (user && isAuthPage) {
    const redirectUrl = new URL(`/${locale}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Unauthenticated user visiting protected route → redirect to locale sign-in
  if (!user && !isAuthPage) {
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images|icons).*)"],
};
