import { auth } from "@/lib/auth/auth";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

// next-intl middleware for locale handling
const intlMiddleware = createMiddleware(routing);

// Public routes that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/about",
];

// Check if path is public (handles locale prefixes)
function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;

  for (const locale of routing.locales) {
    for (const path of PUBLIC_PATHS) {
      if (pathname === `/${locale}${path}` || pathname.startsWith(`/${locale}${path}/`)) {
        return true;
      }
    }
    if (pathname === `/${locale}`) return true;
  }

  return false;
}

// Check if path is an auth page (for redirecting logged-in users away)
function isAuthPage(pathname: string): boolean {
  const authPaths = ["/sign-in", "/sign-up"];
  for (const locale of routing.locales) {
    for (const path of authPaths) {
      if (pathname.startsWith(`/${locale}${path}`)) return true;
    }
  }
  return false;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and monitoring endpoints
  if (pathname.startsWith("/api/") || pathname.startsWith("/monitoring")) {
    return NextResponse.next();
  }

  // Extract locale from pathname for redirect URLs
  const localePattern = new RegExp(`^/(${routing.locales.join("|")})(?:/|$)`);
  const locale = pathname.match(localePattern)?.[1] ?? routing.defaultLocale;

  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Unauthenticated user trying to access protected route
  if (!session && !isPublicRoute(pathname)) {
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Authenticated user on auth page → redirect to dashboard
  if (session && isAuthPage(pathname)) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  // Let next-intl handle locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|xml|txt|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
