'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { Track } from '@/types'
import { createClient } from '@/lib/supabase/client'
import TrackCard from '@/components/TrackCard'

export default function LikedPage() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('liked_songs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) {
        setTracks(
          data
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
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg bg-linear-to-br from-purple-600 to-blue-500 flex items-center justify-center">
          <Heart size={28} className="text-white fill-white" />
        </div>
        <div>
          <p className="text-zinc-400 text-xs uppercase tracking-widest">Playlist</p>
          <h1 className="text-2xl font-bold text-white">Liked Songs</h1>
          <p className="text-zinc-400 text-sm">{tracks.length} songs</p>
        </div>
      </div>

      {loading && <p className="text-zinc-400 text-sm">Loading...</p>}

      {!loading && tracks.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <Heart size={40} className="mx-auto mb-3 opacity-30" />
          <p>Songs you like will appear here</p>
        </div>
      )}

      <div className="space-y-1">
        {tracks.map((track, i) => (
          <TrackCard
            key={track.id}
            track={track}
            trackList={tracks}
            trackIndex={i}
          />
        ))}
      </div>
    </div>
  )
}