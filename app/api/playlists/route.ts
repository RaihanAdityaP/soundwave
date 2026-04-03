import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const includeTracks = req.nextUrl.searchParams.get('include_tracks')

  // Query playlists dengan count
  const { data: playlists, error } = await supabase
    .from('playlists')
    .select('*, playlist_tracks(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Kalau perlu thumbnails, fetch terpisah
  if (includeTracks && playlists) {
    const limit = parseInt(includeTracks)
    for (const playlist of playlists) {
      const { data: tracks } = await supabase
        .from('playlist_tracks')
        .select('thumbnail, title, artist')
        .eq('playlist_id', playlist.id)
        .order('position', { ascending: true })
        .limit(limit)
      
      // Merge tracks ke playlist_tracks array
      if (tracks) {
        playlist.playlist_tracks = [
          playlist.playlist_tracks[0], // keep count object
          ...tracks
        ]
      }
    }
  }

  return NextResponse.json(playlists)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('playlists')
    .insert({ user_id: user.id, name: name.trim(), description: description?.trim() ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}