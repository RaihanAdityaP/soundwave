import { Track } from '@/types'

export async function searchDeezer(query: string): Promise<Track[]> {
  try {
    const res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15&output=json`
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!data.data?.length) return []

    return data.data.map((item: any): Track => ({
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