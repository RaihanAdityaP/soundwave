'use client'

import Image from 'next/image'
import { Play } from 'lucide-react'
import { Track } from '@/types'
import { usePlayerStore } from '@/store/playerStore'
import LikeButton from './LikeButton'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function TrackCard({ track }: { track: Track }) {
  const { setCurrentTrack, addToQueue } = usePlayerStore()

  const handlePlay = () => {
    addToQueue(track)
    setCurrentTrack(track)
  }

  return (
    <div
      className="group flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
      onClick={handlePlay}
    >
      {/* Thumbnail */}
      <div className="relative w-12 h-12 shrink-0">
        <Image
          src={track.thumbnail || '/placeholder.png'}
          alt={track.title}
          fill
          className="object-cover rounded"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
          <Play size={18} className="text-white fill-white" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{track.title}</p>
        <p className="text-zinc-400 text-xs truncate">{track.artist}</p>
      </div>

      {/* Source badge */}
      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
        track.source === 'youtube'
          ? 'bg-red-900/50 text-red-400'
          : 'bg-purple-900/50 text-purple-400'
      }`}>
        {track.source === 'youtube' ? 'YT' : 'DZ'}
      </span>

      {/* Duration */}
      <span className="text-zinc-500 text-xs shrink-0">{formatDuration(track.duration)}</span>

      {/* Like */}
      <div onClick={(e) => e.stopPropagation()}>
        <LikeButton track={track} />
      </div>
    </div>
  )
}