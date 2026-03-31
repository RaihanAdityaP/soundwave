import { Track } from '@/types'

const YT_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
const INVIDIOUS_URL = process.env.NEXT_PUBLIC_INVIDIOUS_URL || 'https://invidious.io.lol'

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  return (parseInt(match[1] || '0') * 3600) +
         (parseInt(match[2] || '0') * 60) +
         parseInt(match[3] || '0')
}

// Search via YouTube Data API v3
export async function searchYouTube(query: string): Promise<Track[]> {
  try {
    if (!YT_API_KEY) throw new Error('No YouTube API key')

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&q=${encodeURIComponent(query)}&maxResults=10&key=${YT_API_KEY}`
    )
    const searchData = await searchRes.json()
    if (!searchData.items?.length) return []

    const ids = searchData.items.map((i: any) => i.id.videoId).join(',')
    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${ids}&key=${YT_API_KEY}`
    )
    const detailData = await detailRes.json()

    return detailData.items.map((item: any): Track => ({
      id: item.id,
      source: 'youtube',
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      duration: parseDuration(item.contentDetails.duration),
      url: item.id,
    }))
  } catch {
    // Fallback to Invidious
    return searchInvidious(query)
  }
}

// Fallback: Invidious (open-source YouTube frontend, no key needed)
export async function searchInvidious(query: string): Promise<Track[]> {
  const res = await fetch(
    `${INVIDIOUS_URL}/api/v1/search?q=${encodeURIComponent(query)}&type=video`
  )
  const data = await res.json()

  return data.slice(0, 10).map((item: any): Track => ({
    id: item.videoId,
    source: 'youtube',
    title: item.title,
    artist: item.author,
    thumbnail: `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
    duration: item.lengthSeconds,
    url: item.videoId,
  }))
}

// Resolve a Deezer track to a YouTube video ID
// Called at play time so we don't waste API quota on search results
export async function resolveYouTubeId(query: string): Promise<string | null> {
  try {
    if (YT_API_KEY) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=1&key=${YT_API_KEY}`
      )
      const data = await res.json()
      return data.items?.[0]?.id?.videoId ?? null
    }
    // Invidious fallback
    const res = await fetch(
      `${INVIDIOUS_URL}/api/v1/search?q=${encodeURIComponent(query)}&type=video`
    )
    const data = await res.json()
    return data?.[0]?.videoId ?? null
  } catch {
    return null
  }
}