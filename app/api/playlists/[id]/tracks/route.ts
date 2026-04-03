import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const track = await req.json()

  // Verifikasi playlist milik user
  const { data: playlist } = await supabase
    .from('playlists').select('id').eq('id', id).eq('user_id', user.id).single()
  if (!playlist) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('playlist_tracks').upsert({
    playlist_id: id,
    track_id: track.id,
    source: track.source,
    title: track.title,
    artist: track.artist,
    thumbnail: track.thumbnail,
    duration: track.duration,
  }, { onConflict: 'playlist_id,track_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Track added to playlist.' })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { trackId } = await req.json()

  const { error } = await supabase
    .from('playlist_tracks')
    .delete()
    .eq('playlist_id', id)
    .eq('track_id', trackId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Track removed from playlist.' })
}