import { create } from 'zustand'
import { Track, LyricLine } from '@/types'

interface PlayerState {
  currentTrack: Track | null
  queue: Track[]
  isPlaying: boolean
  volume: number
  progress: number // 0-1
  showLyrics: boolean
  lyrics: LyricLine[]

  setCurrentTrack: (track: Track) => void
  addToQueue: (track: Track) => void
  setIsPlaying: (playing: boolean) => void
  setVolume: (volume: number) => void
  setProgress: (progress: number) => void
  toggleLyrics: () => void
  setLyrics: (lyrics: LyricLine[]) => void
  playNext: () => void
  playPrev: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  showLyrics: false,
  lyrics: [],

  setCurrentTrack: (track) => set({ currentTrack: track, isPlaying: true, progress: 0 }),
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  toggleLyrics: () => set((state) => ({ showLyrics: !state.showLyrics })),
  setLyrics: (lyrics) => set({ lyrics }),

  playNext: () => {
    const { queue, currentTrack } = get()
    if (!currentTrack || queue.length === 0) return
    const idx = queue.findIndex((t) => t.id === currentTrack.id)
    const next = queue[idx + 1] ?? queue[0]
    set({ currentTrack: next, isPlaying: true, progress: 0 })
  },

  playPrev: () => {
    const { queue, currentTrack } = get()
    if (!currentTrack || queue.length === 0) return
    const idx = queue.findIndex((t) => t.id === currentTrack.id)
    const prev = queue[idx - 1] ?? queue[queue.length - 1]
    set({ currentTrack: prev, isPlaying: true, progress: 0 })
  },
}))