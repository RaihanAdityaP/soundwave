'use client'

import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@/store/playerStore'

export default function LyricsPanel() {
  const { lyrics, progress, currentTrack, seekTo } = usePlayerStore()
  const currentTime = currentTrack ? progress * (currentTrack.duration) : 0

  const activeIndex = lyrics.reduce((acc, line, i) => {
    if (line.time <= currentTime) return i
    return acc
  }, 0)

  const activeRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeIndex])

  if (!lyrics.length) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No lyrics found
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-12 flex flex-col gap-3 scroll-smooth">
      {lyrics.map((line, i) => (
        <p
          key={i}
          ref={i === activeIndex ? activeRef : null}
          onClick={() => seekTo?.(line.time)}
          className={`text-lg font-medium transition-all duration-300 cursor-pointer select-none ${
            i === activeIndex
              ? 'text-white scale-105 origin-left'
              : 'text-zinc-600 hover:text-zinc-400'
          }`}
        >
          {line.text || '♪'}
        </p>
      ))}
    </div>
  )
}