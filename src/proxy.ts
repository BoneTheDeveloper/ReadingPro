import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  "/",
  "/:locale",
  "/sign-in(.*)",
  "/:locale/sign-in(.*)",
  "/sign-up(.*)",
  "/:locale/sign-up(.*)",
  "/about(.*)",
  "/:locale/about(.*)",
]);

const isAuthPage = createRouteMatcher([
  "/sign-in(.*)",
  "/:locale/sign-in(.*)",
  "/sign-up(.*)",
  "/:locale/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") || pathname.startsWith("/monitoring")) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  const localePattern = new RegExp(`^/(${routing.locales.join("|")})(?:/|$)`);
  const locale = pathname.match(localePattern)?.[1] ?? routing.defaultLocale;

  if (!userId && !isPublicRoute(request)) {
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (userId && isAuthPage(request)) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|xml|txt|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
