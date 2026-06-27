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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.url;

  if (!userId && !isAuthPage(request)) {
    const signInUrl = new URL(`/${locale}/sign-in`, siteUrl);
    const returnUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, siteUrl);
    signInUrl.searchParams.set("redirect_url", returnUrl.toString());
    return NextResponse.redirect(signInUrl);
  }

  if (userId && isAuthPage(request)) {
    return NextResponse.redirect(new URL(`/${locale}`, siteUrl));
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
