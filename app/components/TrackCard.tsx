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

interface Props {
  track: Track
  /** Seluruh daftar lagu di konteks saat ini (search results / liked songs) */
  trackList?: Track[]
  /** Posisi track ini di trackList */
  trackIndex?: number
}

export default function TrackCard({ track, trackList, trackIndex }: Props) {
  const { setQueue, currentTrack, isPlaying } = usePlayerStore()

  const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying

  const handlePlay = () => {
    if (trackList && trackIndex !== undefined) {
      // Set seluruh list sebagai queue, mulai dari lagu yang diklik
      setQueue(trackList, trackIndex)
    } else {
      // Fallback: hanya mainkan satu lagu ini
      setQueue([track], 0)
    }
  }

  return (
    <div
      className={`group flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer ${
        isCurrentlyPlaying ? 'bg-zinc-800/60' : ''
      }`}
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
        {/* Indikator lagu aktif */}
        {isCurrentlyPlaying && (
          <div className="absolute inset-0 flex items-center justify-center rounded">
            <span className="flex gap-0.75 items-end h-4">
              <span className="w-0.75 bg-green-400 rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
              <span className="w-0.75 bg-green-400 rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
              <span className="w-0.75 bg-green-400 rounded-full animate-bounce" style={{ height: '40%', animationDelay: '75ms' }} />
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrentlyPlaying ? 'text-green-400' : 'text-white'}`}>
          {track.title}
        </p>
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