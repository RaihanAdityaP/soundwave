export type AudioSource = 'youtube' | 'deezer'

export interface Track {
  id: string
  source: AudioSource
  title: string
  artist: string
  thumbnail: string
  duration: number        // in seconds
  url?: string            // YouTube video ID (resolved at play time for deezer tracks)
  youtubeQuery?: string   // used by deezer tracks to find YouTube match
}

export interface LyricLine {
  time: number // in seconds
  text: string
}

export interface SearchResults {
  youtube: Track[]
  deezer: Track[]
}