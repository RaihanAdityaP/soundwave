import { LyricLine } from '@/types'

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

function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreMatch(candidate: any, title: string, artist: string): number {
  const t = normalize(candidate.trackName ?? '')
  const a = normalize(candidate.artistName ?? '')
  const wantTitle = normalize(title)
  const wantArtist = normalize(artist)

  let score = 0

  if (t === wantTitle) score += 10
  else if (t.includes(wantTitle) || wantTitle.includes(t)) score += 5

  if (a === wantArtist) score += 5
  else if (a.includes(wantArtist) || wantArtist.includes(a)) score += 2

  if (candidate.syncedLyrics) score += 3

  return score
}

export async function fetchLyrics(title: string, artist: string): Promise<LyricLine[]> {
  try {
    const res = await fetch(
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`
    )
    const data = await res.json()

    if (!Array.isArray(data) || data.length === 0) return []

    const scored = data
      .map((t: any) => ({ track: t, score: scoreMatch(t, title, artist) }))
      .sort((a, b) => b.score - a.score)

    // Kalau skor terlalu rendah, kemungkinan tidak relevan
    if (scored[0].score < 3) return []

    const best = scored[0].track

    if (best.syncedLyrics) return parseLRC(best.syncedLyrics)

    if (best.plainLyrics) {
      return best.plainLyrics
        .split('\n')
        .filter((text: string) => text.trim() !== '')
        .map((text: string, i: number) => ({ time: i * 3, text }))
    }

    return []
  } catch {
    return []
  }
}