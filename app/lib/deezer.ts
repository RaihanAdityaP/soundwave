import { Track } from '@/types'

type DeezerSearchItem = {
  id: number | string
  title: string
  duration: number
  bpm?: number | null
  artist: { name: string }
  album: { cover_medium: string }
}

function isDeezerSearchItem(value: unknown): value is DeezerSearchItem {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    (typeof v.id === 'number' || typeof v.id === 'string') &&
    typeof v.title === 'string' &&
    typeof v.duration === 'number' &&
    !!v.artist &&
    typeof (v.artist as Record<string, unknown>).name === 'string' &&
    !!v.album &&
    typeof (v.album as Record<string, unknown>).cover_medium === 'string'
  )
}

export async function searchDeezer(query: string): Promise<Track[]> {
  try {
    const res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15&output=json`
    )
    if (!res.ok) return []
    const data = await res.json()
    const items = Array.isArray((data as { data?: unknown[] }).data)
      ? (data as { data: unknown[] }).data.filter(isDeezerSearchItem)
      : []
    if (!items.length) return []

    return items.map((item): Track => ({
      id: String(item.id),
      source: 'deezer',
      title: item.title,
      artist: item.artist.name,
      thumbnail: item.album.cover_medium,
      duration: item.duration,
      url: undefined,
      youtubeQuery: `${item.title} ${item.artist.name}`,
      bpm: item.bpm && item.bpm > 0 ? Math.round(item.bpm) : undefined,
    }))
  } catch (err) {
    console.error('[deezer] fetch failed:', err)
    return []
  }
}