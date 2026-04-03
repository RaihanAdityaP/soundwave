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

  const { count: likedCount } = await supabase
    .from('liked_songs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <ProfileClient
      user={user}
      profile={profile}
      likedCount={likedCount ?? 0}
    />
  )
}