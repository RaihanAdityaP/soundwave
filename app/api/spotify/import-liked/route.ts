import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const providerToken = session.provider_token
  if (!providerToken) {
    return NextResponse.json(
      { error: 'No Spotify token found. Please re-login with Spotify.' },
      { status: 400 }
    )
  }

  // Fetch semua liked songs dari Spotify (pagination 50 per request)
  const tracks: any[] = []
  let url: string | null = 'https://api.spotify.com/v1/me/tracks?limit=50'

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${providerToken}` },
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      // Token expired atau invalid
      if (res.status === 401) {
        return NextResponse.json(
          { error: 'Spotify token expired. Please re-login with Spotify.' },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { error: errBody?.error?.message ?? 'Failed to fetch Spotify liked songs.' },
        { status: res.status }
      )
    }

    const data = await res.json()
    tracks.push(...(data.items ?? []))
    url = data.next ?? null
  }

  if (tracks.length === 0) {
    return NextResponse.json({ imported: 0, message: 'No liked songs found on Spotify.' })
  }

  // Ambil user & liked songs playlist
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: likedPlaylist } = await supabase
    .from('playlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_liked_songs', true)
    .single()

  if (!likedPlaylist) {
    return NextResponse.json({ error: 'Liked Songs playlist not found.' }, { status: 404 })
  }

  // Map ke format playlist_tracks
  // Source 'deezer' biar PlayerBar pakai youtubeQuery untuk resolve ke YT saat play
  const rows = tracks
    .filter(({ track }) => track && !track.is_local)
    .map(({ track }) => ({
      playlist_id: likedPlaylist.id,
      track_id: `spotify:${track.id}`,
      source: 'deezer' as const,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      thumbnail:
        track.album.images.find((img: any) => img.width <= 300)?.url ??
        track.album.images[0]?.url ??
        '',
      duration: Math.floor(track.duration_ms / 1000),
    }))

  // Upsert batch — skip duplikat
  const { error: upsertError } = await supabase
    .from('playlist_tracks')
    .upsert(rows, { onConflict: 'playlist_id,track_id' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ imported: rows.length })
}