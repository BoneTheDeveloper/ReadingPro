import { NextResponse } from 'next/server'
import { createServerActionClient } from '@/lib/supabase/server'
import { syncUser } from '@/lib/auth/sync-user'
import { setCachedProfile } from '@/lib/auth/auth-cache'
import { getSafeNextPath } from '@/lib/auth/redirects'

function getRedirectOrigin(requestOrigin: string) {
  return process.env.NEXT_PUBLIC_SITE_URL || requestOrigin
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = getSafeNextPath(searchParams.get('next'))
  const redirectOrigin = getRedirectOrigin(origin)

  if (code) {
    const supabase = await createServerActionClient()
    const { data: { session, user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      const profile = await syncUser(
        user.id,
        user.email!,
        user.user_metadata?.name as string || user.user_metadata?.full_name as string,
        user.user_metadata?.avatar_url as string,
      )
      if (session?.access_token) {
        setCachedProfile(session.access_token, profile)
      }
      return NextResponse.redirect(`${redirectOrigin}${next}`)
    }
  }

  return NextResponse.redirect(`${redirectOrigin}/sign-in?error=auth_callback_failed`)
}
