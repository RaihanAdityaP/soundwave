'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ListMusic, Heart, Play, Shuffle } from 'lucide-react'
import { Track } from '@/types'
import { createClient } from '@/lib/supabase/client'
import TrackCard from '@/components/TrackCard'
import { usePlayerStore } from '@/store/playerStore'

type PlaylistMeta = {
  name: string
  description: string | null
  is_liked_songs: boolean
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { setQueue } = usePlayerStore()

  const [playlist, setPlaylist] = useState<PlaylistMeta | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: pl } = await supabase
        .from('playlists')
        .select('name, description, is_liked_songs')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (!pl) { router.push('/library'); return }

      setPlaylist(pl)

      const { data: trackRows } = await supabase
        .from('playlist_tracks')
        .select('*')
        .eq('playlist_id', id)
        .order('added_at', { ascending: false })

      setTracks(
        (trackRows ?? [])
          .filter((row) => !!row.track_id)
          .map((row): Track => ({
            id: row.track_id,
            source: row.source,
            title: row.title,
            artist: row.artist,
            thumbnail: row.thumbnail,
            duration: row.duration,
            url: row.track_id,
          }))
      )
      setLoading(false)
    }
    load()
  }, [id])

  async function removeTrack(trackId: string) {
    await fetch(`/api/playlists/${id}/tracks`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId }),
    })
    setTracks(prev => prev.filter(t => t.id !== trackId))
  }

  const handlePlayAll = () => setQueue(tracks, 0)

  const handleShuffle = () => {
    const shuffled = shuffleArray(tracks)
    setQueue(shuffled, 0)
  }

  if (loading) return <p className="text-zinc-400 text-sm">Loading...</p>
  if (!playlist) return null

  const isLiked = playlist.is_liked_songs

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end gap-4 md:gap-6">
        {isLiked ? (
          <div className="w-24 h-24 md:w-36 md:h-36 rounded-xl bg-linear-to-br from-purple-600 to-blue-500 flex items-center justify-center shrink-0">
            <Heart size={40} className="text-white fill-white" />
          </div>
        ) : (
          <div className="w-24 h-24 md:w-36 md:h-36 rounded-xl bg-zinc-700 flex items-center justify-center shrink-0">
            <ListMusic size={40} className="text-zinc-400" />
          </div>
        )}

        <div className="min-w-0">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Playlist</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white truncate">
            {isLiked ? 'Liked Songs' : playlist.name}
          </h1>
          {!isLiked && playlist.description && (
            <p className="text-zinc-400 text-sm mt-1">{playlist.description}</p>
          )}
          <p className="text-zinc-500 text-sm mt-1">{tracks.length} songs</p>

          {tracks.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-full px-5 py-2 transition-colors"
              >
                <Play size={15} className="fill-black" />
                Play All
              </button>
              <button
                onClick={handleShuffle}
                className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-sm rounded-full px-5 py-2 transition-colors"
              >
                <Shuffle size={15} />
                Shuffle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Track list */}
      {tracks.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          {isLiked
            ? <Heart size={36} className="mx-auto mb-3 opacity-30" />
            : <ListMusic size={36} className="mx-auto mb-3 opacity-30" />
          }
          <p className="text-sm">
            {isLiked ? 'Songs you like will appear here' : 'No songs yet. Add from search!'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {tracks.map((track, i) => (
            <TrackCard
              key={track.id}
              track={track}
              trackList={tracks}
              trackIndex={i}
              onRemove={!isLiked ? () => removeTrack(track.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}