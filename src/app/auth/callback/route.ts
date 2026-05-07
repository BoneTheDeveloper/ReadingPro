import { NextResponse } from 'next/server'
import { createServerActionClient } from '@/lib/supabase/server'
import { syncUser } from '@/lib/auth/sync-user'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/study'

  if (code) {
    const supabase = await createServerActionClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      await syncUser(user.id, user.email!, user.user_metadata?.name)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`)
}
