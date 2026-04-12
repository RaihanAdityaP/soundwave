import { LyricLine } from '@/types'

type LrclibTrack = {
  id: number
  trackName?: string
  artistName?: string
  duration?: number
  syncedLyrics?: string
  plainLyrics?: string
}

// ─── LRC parser ───────────────────────────────────────────────────────────────

function parseLRC(lrc: string): LyricLine[] {
  const lines = lrc.split('\n')
  const result: LyricLine[] = []
  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/)
    if (match) {
      const time =
        parseInt(match[1]) * 60 +
        parseInt(match[2]) +
        parseInt(match[3]) / 1000
      result.push({ time, text: match[4].trim() })
    }
  }
  return result.sort((a, b) => a.time - b.time)
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

const CJK_RE = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g

function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Extract only CJK characters from a string (joined, no spaces) */
function extractCJK(str: string): string {
  return (str.match(CJK_RE) || []).join('')
}

/** Extract only latin/ASCII words from a string */
function extractLatin(str: string): string {
  return str
    .replace(CJK_RE, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Aggressively clean a YouTube/Deezer title down to the core song name.
 * Returns an array of candidates to try, from most-specific to least.
 */
function titleVariants(raw: string): string[] {
  const variants: string[] = []

  let t = raw

  // Remove 【...】 ［...］ bracketed prefixes (Asian YouTube style)
  t = t.replace(/^[\u3010\u3011\uff3b\uff3d][^\u3010\u3011\uff3b\uff3d]*[\u3010\u3011\uff3b\uff3d]\s*/g, '')

  // Remove (Official...) / [MV] / (Lyrics) / [HD] etc.
  t = t.replace(/\s*[\(\[].*(official|video|audio|lyrics?|lyric|hd|hq|mv|music|clip|visualizer|remaster(?:ed)?|version|live|acoustic|cover|remix|radio\s?edit|full\s?ver|short\s?ver)[^\)\]]*[\)\]]/gi, '')

  // Remove feat/ft
  t = t.replace(/\s*[\(\[]?\s*f(?:ea)?t\.?\s+[^\)\],|]+[\)\]]?/gi, '')

  // Remove " - Topic" / "- VEVO" channel suffixes
  t = t.replace(/\s*[-–]\s*(topic|vevo|official|records?|music|tv)$/gi, '')

  // Split by " - " and take last part (usually the actual song title)
  const dashParts = t.split(/\s+-\s+/)
  const afterDash = dashParts[dashParts.length - 1].trim()

  // Also try the part before the dash (sometimes it's "Artist - Song" and we want "Song")
  // but only when there are exactly 2 parts
  const beforeDash = dashParts.length === 2 ? dashParts[0].trim() : null

  // Build variants list
  const cleaned = afterDash || t.trim()
  variants.push(cleaned)

  if (beforeDash && beforeDash !== cleaned) variants.push(beforeDash)

  // If the cleaned title has CJK, also try CJK-only segment
  const cjk = extractCJK(cleaned)
  if (cjk && cjk !== cleaned) variants.push(cjk)

  // Also try latin-only segment (e.g. "Hometown Moon" from "故乡月 Hometown Moon MV")
  const latin = extractLatin(cleaned).replace(/\bmv\b|\blyrics?\b|\bofficial\b/gi, '').trim()
  if (latin && latin !== cleaned && latin.length > 2) variants.push(latin)

  // Raw as final fallback
  if (!variants.includes(raw)) variants.push(raw)

  // Deduplicate
  return [...new Set(variants.filter(Boolean))]
}

function cleanArtist(raw: string): string {
  return raw
    .replace(/\s*[-–]\s*(topic|vevo|official|records?|music|tv)$/gi, '')
    .replace(/\s*[\(\[]?\s*f(?:ea)?t\.?\s+[^\)\]]+[\)\]]?/gi, '')
    .trim()
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreMatch(
  candidate: LrclibTrack,
  titleVariantsList: string[],
  artist: string,
  duration?: number,
): number {
  const t = normalize(candidate.trackName ?? '')
  const a = normalize(candidate.artistName ?? '')
  const wantArtist = normalize(artist)

  let titleScore = 0
  for (const variant of titleVariantsList) {
    const want = normalize(variant)
    if (!want) continue
    if (t === want) { titleScore = Math.max(titleScore, 12); break }
    if (t.includes(want) || want.includes(t)) { titleScore = Math.max(titleScore, 6) }
  }

  let artistScore = 0
  if (a === wantArtist) artistScore = 6
  else if (a.includes(wantArtist) || wantArtist.includes(a)) artistScore = 3

  let durationScore = 0
  if (duration !== undefined && candidate.duration != null) {
    const diff = Math.abs(candidate.duration - duration)
    if (diff <= 3) durationScore = 6
    else if (diff <= 10) durationScore = 3
    else if (diff <= 30) durationScore = 1
    else if (diff > 90) durationScore = -4
  }

  const syncedBonus = candidate.syncedLyrics ? 3 : 0

  return titleScore + artistScore + durationScore + syncedBonus
}

// ─── LRCLIB helpers ───────────────────────────────────────────────────────────

const UA = { 'User-Agent': 'SoundWave/1.0' }
const TIMEOUT = 8000

async function lrclibGet(title: string, artist: string, duration?: number): Promise<LrclibTrack | null> {
  try {
    const params = new URLSearchParams({ track_name: title, artist_name: artist })
    if (duration !== undefined) params.set('duration', String(Math.round(duration)))
    const res = await fetch(`https://lrclib.net/api/get?${params}`, {
      headers: UA,
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (res.status === 200) return await res.json() as LrclibTrack
    return null
  } catch { return null }
}

async function lrclibSearch(qs: string): Promise<LrclibTrack[]> {
  try {
    const res = await fetch(`https://lrclib.net/api/search?${qs}`, {
      headers: UA,
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) return []
    const data = await res.json() as unknown
    return Array.isArray(data) ? data as LrclibTrack[] : []
  } catch { return [] }
}

function lyricsFromTrack(track: LrclibTrack): LyricLine[] | null {
  if (track.syncedLyrics) {
    const parsed = parseLRC(track.syncedLyrics)
    if (parsed.length > 0) return parsed
  }
  if (track.plainLyrics) {
    return track.plainLyrics
      .split('\n')
      .filter((t: string) => t.trim())
      .map((t: string, i: number) => ({ time: i * 3, text: t }))
  }
  return null
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchLyrics(
  title: string,
  artist: string,
  duration?: number,
): Promise<LyricLine[]> {
  const variants = titleVariants(title)
  const cleanedArtist = cleanArtist(artist)
  const primaryTitle = variants[0]

  console.log(`[lyrics] title variants:`, variants)
  console.log(`[lyrics] artist: "${cleanedArtist}"`, duration ? `(${duration}s)` : '')

  // ── Strategy 1: exact GET for each title variant (stop at first hit) ─────
  for (const v of variants) {
    const exact = await lrclibGet(v, cleanedArtist, duration)
    if (exact) {
      const lines = lyricsFromTrack(exact)
      if (lines) {
        console.log(`[lyrics] ✓ exact GET: "${v}"`)
        return lines
      }
    }
  }

  // ── Strategy 2: search queries in parallel for all variants ─────────────
  const searchPromises: Promise<LrclibTrack[]>[] = []

  for (const v of variants) {
    // track_name + artist_name
    searchPromises.push(
      lrclibSearch(`track_name=${encodeURIComponent(v)}&artist_name=${encodeURIComponent(cleanedArtist)}`)
    )
    // broad q= search
    searchPromises.push(
      lrclibSearch(`q=${encodeURIComponent(v)}`)
    )
  }

  // Also try combined query
  searchPromises.push(
    lrclibSearch(`q=${encodeURIComponent(`${primaryTitle} ${cleanedArtist}`)}`)
  )

  const results = await Promise.all(searchPromises)

  // Deduplicate candidates by id
  const seen = new Set<number>()
  const candidates: LrclibTrack[] = []
  for (const batch of results) {
    for (const c of batch) {
      if (!seen.has(c.id)) {
        seen.add(c.id)
        candidates.push(c)
      }
    }
  }

  console.log(`[lyrics] total unique candidates: ${candidates.length}`)

  if (candidates.length === 0) {
    console.log('[lyrics] no candidates found')
    return []
  }

  // ── Score and rank ────────────────────────────────────────────────────────
  const scored = candidates
    .map(t => ({ track: t, score: scoreMatch(t, variants, cleanedArtist, duration) }))
    .sort((a, b) => b.score - a.score)

  console.log('[lyrics] top candidates:', scored.slice(0, 3).map(s => ({
    title: s.track.trackName,
    artist: s.track.artistName,
    score: s.score,
    synced: !!s.track.syncedLyrics,
    dur: s.track.duration,
  })))

  if (scored[0].score < 1) {
    console.log('[lyrics] best score too low, skipping')
    return []
  }

  // Among top candidates (within 4 pts), prefer synced lyrics
  const topCandidates = scored.filter(s => s.score >= scored[0].score - 4)
  const pick = topCandidates.find(s => s.track.syncedLyrics) ?? topCandidates[0]

  console.log(`[lyrics] ✓ picked "${pick.track.trackName}" by "${pick.track.artistName}" (score ${pick.score})`)

  return lyricsFromTrack(pick.track) ?? []
}