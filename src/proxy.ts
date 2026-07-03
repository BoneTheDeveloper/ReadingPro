import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  "/:locale", // trang chủ
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)",
  "/:locale/about(.*)", // thêm route public khác nếu có
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
    return NextResponse.next();
  }

  const { userId } = await auth();

  const localePattern = new RegExp(`^/(${routing.locales.join("|")})(?:/|$)`);
  const locale = pathname.match(localePattern)?.[1] ?? routing.defaultLocale;

  const isAuthPage =
    pathname.includes("/sign-in") || pathname.includes("/sign-up");

  if (!userId && !isPublicRoute(request)) {
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (userId && isAuthPage) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
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
