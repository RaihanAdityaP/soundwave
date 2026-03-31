import { LyricLine } from '@/types'

// Parse LRC format into array of timed lines
function parseLRC(lrc: string): LyricLine[] {
  const lines = lrc.split('\n')
  const result: LyricLine[] = []

  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/)
    if (match) {
      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      const ms = parseInt(match[3])
      const time = minutes * 60 + seconds + ms / 1000
      result.push({ time, text: match[4].trim() })
    }
  }

  return result.sort((a, b) => a.time - b.time)
}

export async function fetchLyrics(title: string, artist: string): Promise<LyricLine[]> {
  try {
    const res = await fetch(
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`
    )
    const data = await res.json()

    const track = data.find((t: any) => t.syncedLyrics) || data[0]
    if (!track) return []

    if (track.syncedLyrics) return parseLRC(track.syncedLyrics)

    // Plain lyrics fallback (no timestamps)
    return track.plainLyrics
      .split('\n')
      .map((text: string, i: number) => ({ time: i * 3, text }))
  } catch {
    return []
  }
}