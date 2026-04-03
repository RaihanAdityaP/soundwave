import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Ambil liked songs count via playlist system
  const { data: likedPlaylist } = await supabase
    .from('playlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_liked_songs', true)
    .single()

  const { count: likedCount } = likedPlaylist
    ? await supabase
        .from('playlist_tracks')
        .select('*', { count: 'exact', head: true })
        .eq('playlist_id', likedPlaylist.id)
    : { count: 0 }

  return (
    <ProfileClient
      user={user}
      profile={profile}
      likedCount={likedCount ?? 0}
    />
  )
}