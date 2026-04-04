import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const includeTracksParam = req.nextUrl.searchParams.get('include_tracks')

  // Sanitasi input: clamp ke rentang yang aman, default 4
  const limit = includeTracksParam
    ? Math.min(20, Math.max(1, Number.parseInt(includeTracksParam) || 4))
    : null

  // Pastikan liked songs playlist selalu ada
  const { data: likedPlaylist, error: likedError } = await supabase
    .from('playlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_liked_songs', true)
    .maybeSingle()

  if (likedError)
    return NextResponse.json({ error: likedError.message }, { status: 500 })

  if (!likedPlaylist) {
    const { error: createLikedError } = await supabase.from('playlists').insert({
      user_id: user.id,
      name: 'Liked Songs',
      is_liked_songs: true,
      is_public: false,
    })
    if (createLikedError)
      return NextResponse.json({ error: createLikedError.message }, { status: 500 })
  }

  // Ambil semua playlist dengan count tracks
  const { data: playlists, error } = await supabase
    .from('playlists')
    .select('*, playlist_tracks(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Kalau perlu thumbnails, fetch semua sekaligus (satu query, bukan N+1)
  if (limit && playlists && playlists.length > 0) {
    const playlistIds = playlists.map((p) => p.id)

    const { data: allTracks } = await supabase
      .from('playlist_tracks')
      .select('playlist_id, thumbnail, title, artist, position')
      .in('playlist_id', playlistIds)
      .order('position', { ascending: true })

    // Kelompokkan tracks per playlist_id
    const tracksByPlaylist: Record<string, typeof allTracks> = {}
    if (allTracks) {
      for (const track of allTracks) {
        if (!tracksByPlaylist[track.playlist_id]) {
          tracksByPlaylist[track.playlist_id] = []
        }
        if (tracksByPlaylist[track.playlist_id]!.length < limit) {
          tracksByPlaylist[track.playlist_id]!.push(track)
        }
      }
    }

    // Merge ke dalam setiap playlist
    for (const playlist of playlists) {
      playlist.playlist_tracks = [
        playlist.playlist_tracks[0], // keep count object
        ...(tracksByPlaylist[playlist.id] ?? []),
      ]
    }
  }

  return NextResponse.json(playlists)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description } = await req.json()
  if (!name?.trim())
    return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}