import createMiddleware from 'next-intl/middleware';
import {NextRequest, NextResponse} from 'next/server';
import {routing} from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  let response = handleI18nRouting(request);

  // Additional rewrite when NEW_PROFILE cookie is set
  if (response.ok) {
    // (not for errors or redirects)
    const [, locale, ...rest] = new URL(
      response.headers.get('x-middleware-rewrite') || request.url
    ).pathname.split('/');
    const pathname = '/' + rest.join('/');

    if (
      pathname === '/profile' &&
      request.cookies.get('NEW_PROFILE')?.value === 'true'
    ) {
      response = NextResponse.rewrite(
        new URL(`/${locale}/profile/new`, request.url),
        {headers: response.headers}
      );
    }
  }

  return response;
}

export const config = {
  // Match only internationalized pathnames
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
};
