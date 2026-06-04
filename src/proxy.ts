import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

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
  const localeMatch = pathname.match(/^\/(en|vi)/);
  const locale = localeMatch?.[1] ?? routing.defaultLocale;
  const isAuthPage =
    pathname === `/${locale}/sign-in` ||
    pathname.startsWith(`/${locale}/sign-in/`) ||
    pathname === `/${locale}/sign-up` ||
    pathname.startsWith(`/${locale}/sign-up/`);

  if (!userId && !isAuthPage) {
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    signInUrl.searchParams.set("next", pathname);
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
