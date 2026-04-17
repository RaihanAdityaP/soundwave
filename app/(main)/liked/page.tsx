'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Play, Shuffle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TrackCard from '@/components/TrackCard'
import { Track } from '@/types'
import { usePlayerStore } from '@/store/playerStore'

type LikedPlaylist = {
  id: string
  name: string
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default function LikedPage() {
  const router = useRouter()
  const supabase = createClient()
  const { setQueue } = usePlayerStore()
  const [playlist, setPlaylist] = useState<LikedPlaylist | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: likedPlaylist } = await supabase
        .from('playlists')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_liked_songs', true)
        .single()

      if (!likedPlaylist) {
        router.replace('/library')
        return
      }

      setPlaylist(likedPlaylist)

      const { data: trackRows } = await supabase
        .from('playlist_tracks')
        .select('*')
        .eq('playlist_id', likedPlaylist.id)
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
  }, [])

  if (loading) return <p className="text-zinc-400 text-sm">Loading...</p>
  if (!playlist) return null

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-linear-to-br from-purple-600 via-indigo-500 to-blue-500 p-6 md:p-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-black/20 flex items-center justify-center">
            <Heart size={30} className="text-white fill-white" />
          </div>
          <div>
            <p className="text-white/90 text-xs uppercase tracking-widest">Playlist</p>
            <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight">{playlist.name}</h1>
            <p className="text-white/80 text-sm mt-1">{tracks.length} songs</p>
          </div>
        </div>
      </div>

      {tracks.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQueue(tracks, 0)}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-full px-5 py-2 transition-colors"
          >
            <Play size={15} className="fill-black" />
            Play
          </button>
          <button
            onClick={() => setQueue(shuffleArray(tracks), 0)}
            className="inline-flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-sm rounded-full px-5 py-2 transition-colors"
          >
            <Shuffle size={15} />
            Shuffle
          </button>
        </div>
      )}

      {tracks.length === 0 ? (
        <p className="text-zinc-400 text-sm">No liked songs yet.</p>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, index) => (
            <TrackCard
              key={`${track.source}:${track.id}:${index}`}
              track={track}
              trackList={tracks}
              trackIndex={index}
            />
          ))}
        </div>
      )}
    </div>
  )
}