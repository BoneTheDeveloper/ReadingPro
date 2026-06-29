import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);
const isAuthPage = createRouteMatcher([
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/monitoring") ||
    pathname.startsWith("/__clerk/")
  ) {
    return NextResponse.next({ request });
  }

  const { userId } = await auth();
  const localeMatch = pathname.match(/^\/(en|vi)(?:\/|$)/);
  const locale = localeMatch?.[1] ?? routing.defaultLocale;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.url;

  if (!userId && !isAuthPage(request)) {
    const signInUrl = new URL(`/${locale}/sign-in`, baseUrl);
    const redirectUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, baseUrl).href;
    signInUrl.searchParams.set("redirect_url", redirectUrl);
    return NextResponse.redirect(signInUrl);
  }

  if (userId && isAuthPage(request)) {
    return NextResponse.redirect(new URL(`/${locale}`, baseUrl));
  }

  // Clone the request and update the URL to use the canonical base URL
  // to prevent Host Header Injection in next-intl middleware redirects.
  const safeUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, baseUrl).href;
  const safeRequest = new Request(safeUrl, request);

  return intlMiddleware(safeRequest as any);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
