import { Track } from '@/types'

// Deezer public API — no API key required
export async function searchDeezer(query: string): Promise<Track[]> {
  const res = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15&output=json`
  )
  const data = await res.json()

  if (!data.data?.length) return []

  return data.data.map((item: any): Track => ({
    id: String(item.id),
    source: 'deezer',
    title: item.title,
    artist: item.artist.name,
    thumbnail: item.album.cover_medium, // 250x250, much better than YT thumbnails
    duration: item.duration,
    url: undefined, // will be resolved to YouTube at play time
    youtubeQuery: `${item.title} ${item.artist.name}`,
  }))
}