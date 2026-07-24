import { auth } from "@/lib/auth/auth";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = [
  "/sign-in",
  "/sign-up",
  "/about",
];

function getNormalizedPath(pathname: string): string {
  const localePattern = new RegExp(`^/(${routing.locales.join("|")})(/.*)?$`);
  const match = pathname.match(localePattern);
  return match ? (match[2] || "/") : pathname;
}

function isPublicRoute(pathname: string): boolean {
  const normalizedPath = getNormalizedPath(pathname);
  return PUBLIC_PATHS.includes(normalizedPath);
}

function isAuthPage(pathname: string): boolean {
  const normalizedPath = getNormalizedPath(pathname);
  return ["/sign-in", "/sign-up"].includes(normalizedPath);
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") || pathname.startsWith("/monitoring")) {
    return NextResponse.next();
  }

  const localePattern = new RegExp(`^/(${routing.locales.join("|")})(?:/|$)`);
  const pathLocale = pathname.match(localePattern)?.[1];
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const currentLocale = pathLocale || cookieLocale || routing.defaultLocale;

  const buildUrl = (targetPath: string) => {
    const isDefault = currentLocale === routing.defaultLocale;
    const prefix = (routing.localePrefix === "as-needed" && isDefault)
      ? ""
      : `/${currentLocale}`;
    return new URL(`${prefix}${targetPath}`, request.url);
  };

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const isPublic = isPublicRoute(pathname);
  const isAuth = isAuthPage(pathname);

  if (!session && !isPublic) {
    const signInUrl = buildUrl("/sign-in");
    signInUrl.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (session && isAuth) {
    return NextResponse.redirect(buildUrl("/"));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|xml|txt|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
