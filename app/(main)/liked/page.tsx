'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Play, Music } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TrackCard from '@/components/TrackCard'
import { Track } from '@/types'
import { usePlayerStore } from '@/store/playerStore'

type LikedPlaylist = {
  id: string
  name: string
}

// Spotify logo SVG inline karena lucide tidak punya
function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}

export default function LikedPage() {
  const router = useRouter()
  const supabase = createClient()
  const { setQueue } = usePlayerStore()

  const [playlist, setPlaylist] = useState<LikedPlaylist | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const load = useCallback(async () => {
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
  }, [router, supabase])

  useEffect(() => {
    load()
  }, [load])

  async function handleImportSpotify() {
    setImporting(true)
    setImportMsg(null)

    const res = await fetch('/api/spotify/import-liked', { method: 'POST' })
    const data = await res.json()

    if (res.ok) {
      const count = data.imported as number
      setImportMsg({
        text: count > 0
          ? `✓ ${count} songs imported from Spotify!`
          : 'No new songs to import.',
        ok: true,
      })
      // Reload list setelah import
      setLoading(true)
      await load()
    } else {
      setImportMsg({ text: data.error ?? 'Import failed.', ok: false })
    }

    setImporting(false)
  }

  if (loading) return <p className="text-zinc-400 text-sm">Loading...</p>
  if (!playlist) return null

  return (
    <div className="space-y-5">
      {/* Header */}
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

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {tracks.length > 0 && (
          <button
            onClick={() => setQueue(tracks, 0)}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-full px-4 py-2 transition-colors"
          >
            <Play size={15} className="fill-black" />
            Play
          </button>
        )}

        {/* Import from Spotify */}
        <button
          onClick={handleImportSpotify}
          disabled={importing}
          className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-semibold text-sm rounded-full px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SpotifyIcon className="w-4 h-4 text-[#1DB954]" />
          {importing ? 'Importing...' : 'Import from Spotify'}
        </button>
      </div>

      {/* Import status message */}
      {importMsg && (
        <p className={`text-sm px-4 py-2 rounded-lg ${
          importMsg.ok
            ? 'text-green-400 bg-green-500/10 border border-green-500/20'
            : 'text-red-400 bg-red-500/10 border border-red-500/20'
        }`}>
          {importMsg.ok ? '' : '⚠ '}{importMsg.text}
          {!importMsg.ok && importMsg.text.includes('re-login') && (
            <a
              href="/auth/login"
              className="ml-2 underline underline-offset-2 hover:text-red-300 transition-colors"
            >
              Login ulang
            </a>
          )}
        </p>
      )}

      {/* Track list */}
      {tracks.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 space-y-3">
          <Music size={36} className="mx-auto opacity-30" />
          <p className="text-sm">No liked songs yet.</p>
          <p className="text-xs text-zinc-600">
            Like a song from search, or import your Spotify liked songs above.
          </p>
        </div>
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