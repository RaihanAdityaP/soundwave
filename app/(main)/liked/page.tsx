'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LikedRedirectPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function redirect() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: playlist } = await supabase
        .from('playlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_liked_songs', true)
        .single()

      if (playlist) {
        router.replace(`/library/${playlist.id}`)
      } else {
        router.replace('/library')
      }
    }
    redirect()
  }, [])

  return <p className="text-zinc-400 text-sm">Loading...</p>
}