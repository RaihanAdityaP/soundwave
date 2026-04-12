import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    })
    if (!error) {
      // Cek apakah ini flow invite
      if (type === 'invite') {
        return NextResponse.redirect(`${origin}/auth/set-password`)
      }
      return NextResponse.redirect(`${origin}/`)
    }

    return NextResponse.redirect(`${origin}/auth/login?error=invalid_token`)
  }

  return NextResponse.redirect(`${origin}/auth/login?error=missing_token`)
}