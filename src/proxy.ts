import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

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
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Fast path: getSession() decodes JWT locally (~0ms), checks exp claim
  // Slow path: getUser() validates with Supabase + refreshes expired sessions
  const { data: { session } } = await supabase.auth.getSession();
  let user = session?.user ?? null;

  if (!user) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  const { pathname } = request.nextUrl;

  const isPublicRoute =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/monitoring");

  if (isPublicRoute) {
    // If user is logged in and visits sign-in/sign-up, redirect to dashboard
    if (
      user &&
      (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  if (!user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images|icons).*)"],
};
