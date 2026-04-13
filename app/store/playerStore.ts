import { create } from 'zustand'
import { Track, LyricLine } from '@/types'

interface PlayerState {
  currentTrack: Track | null
  queue: Track[]
  currentIndex: number
  isPlaying: boolean
  volume: number
  progress: number
  lyrics: LyricLine[]
  seekTo: ((seconds: number) => void) | null
  resolving: boolean
  blockAutoNext: boolean

  onAudioPlaying: (() => void) | null

  setCurrentTrack: (track: Track) => void
  setQueue: (tracks: Track[], startIndex?: number) => void
  addToQueue: (track: Track) => void
  setIsPlaying: (playing: boolean) => void
  setVolume: (volume: number) => void
  setProgress: (progress: number) => void
  setLyrics: (lyrics: LyricLine[]) => void
  setSeekTo: (fn: (seconds: number) => void) => void
  setResolving: (v: boolean) => void
  setOnAudioPlaying: (fn: (() => void) | null) => void
  setBlockAutoNext: (v: boolean) => void
  playNext: () => void
  playPrev: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  lyrics: [],
  seekTo: null,
  resolving: false,
  blockAutoNext: false,
  onAudioPlaying: null,

  setQueue: (tracks, startIndex = 0) => {
    const track = tracks[startIndex] ?? null
    set({ queue: tracks, currentIndex: startIndex, currentTrack: track, isPlaying: !!track, progress: 0, resolving: false })
  },

  setCurrentTrack: (track) => set({ currentTrack: track, isPlaying: true, progress: 0, resolving: false }),
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setLyrics: (lyrics) => set({ lyrics }),
  setSeekTo: (fn) => set({ seekTo: fn }),
  setResolving: (v) => set({ resolving: v }),
  setOnAudioPlaying: (fn) => set({ onAudioPlaying: fn }),
  setBlockAutoNext: (v) => set({ blockAutoNext: v }),

  playNext: () => {
    const { queue, currentIndex, blockAutoNext } = get()
    // Fix bug 3: jangan auto-next kalau rhythm game sedang aktif
    if (blockAutoNext) return
    if (queue.length === 0) return
    const nextIndex = currentIndex + 1 < queue.length ? currentIndex + 1 : 0
    set({ currentIndex: nextIndex, currentTrack: queue[nextIndex], isPlaying: true, progress: 0, resolving: false })
  },

  playPrev: () => {
    const { queue, currentIndex } = get()
    if (queue.length === 0) return
    const prevIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : queue.length - 1
    set({ currentIndex: prevIndex, currentTrack: queue[prevIndex], isPlaying: true, progress: 0, resolving: false })
  },
}))