import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Cegah hapus Liked Songs
  const { data: playlist } = await supabase
    .from('playlists').select('is_liked_songs').eq('id', id).single()
  if (playlist?.is_liked_songs)
    return NextResponse.json({ error: 'Cannot delete Liked Songs' }, { status: 403 })

  const { error } = await supabase
    .from('playlists').delete().eq('id', id).eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}