'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ListMusic, Heart, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TrackItem {
  count?: number
  thumbnail?: string
  title?: string
  artist?: string
}

interface Playlist {
  id: string
  name: string
  description: string | null
  is_liked_songs: boolean
  is_public: boolean
  created_at: string
  playlist_tracks: TrackItem[]
}

function PlaylistCover({ thumbs, isLiked }: { thumbs: string[], isLiked?: boolean }) {
  const bg = isLiked ? 'bg-gradient-to-br from-purple-600 to-blue-500' : 'bg-zinc-700'
  const icon = isLiked
    ? <Heart size={32} className="text-white fill-white" />
    : <ListMusic size={32} className="text-white opacity-80" />

  if (thumbs.length === 0) {
    return (
      <div className={`w-full aspect-square rounded-lg mb-3 ${bg} flex items-center justify-center`}>
        {icon}
      </div>
    )
  }

  return (
    <div className="w-full aspect-square rounded-lg mb-3 overflow-hidden relative">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
        {[0, 1, 2, 3].map(i => (
          thumbs[i] ? (
            <img key={i} src={thumbs[i]} alt="" className="w-full h-full object-cover" />
          ) : (
            <div key={i} className={`w-full h-full ${bg} flex items-center justify-center`}>
              {isLiked
                ? <Heart size={14} className="text-white/40" />
                : <ListMusic size={14} className="text-white/40" />}
            </div>
          )
        ))}
      </div>
    </div>
  )
}

export default function LibraryPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const router = useRouter()

  const load = useCallback(async () => {
    const res = await fetch('/api/playlists?include_tracks=4')
    if (res.status === 401) { router.push('/auth/login'); return }
    const data = await res.json()
    setPlaylists(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [router])

  useEffect(() => {
    const id = setTimeout(() => { void load() }, 0)
    return () => clearTimeout(id)
  }, [load])

  async function createPlaylist() {
    if (!name.trim()) return
    setCreating(true)
    await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc }),
    })
    setName(''); setDesc(''); setShowForm(false); setCreating(false)
    load()
  }

  async function deletePlaylist(id: string) {
    await fetch(`/api/playlists/${id}`, { method: 'DELETE' })
    setPlaylists(prev => prev.filter(p => p.id !== id))
  }

  const trackCount = (p: Playlist) => {
    const first = p.playlist_tracks?.[0]
    if (!first) return 0
    // Supabase count returns { count: n }
    return typeof first.count === 'number' ? first.count : 0
  }

  const getTrackThumbnails = (p: Playlist): string[] => {
    // Slice dari index 1 karena index 0 adalah count object
    return p.playlist_tracks?.slice(1, 5).map(pt => pt.thumbnail).filter((t): t is string => !!t) ?? []
  }

  const likedPlaylist = playlists.find(p => p.is_liked_songs)
  const regularPlaylists = playlists.filter(p => !p.is_liked_songs)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Library</h1>
          <p className="text-zinc-400 text-sm mt-1">{playlists.length} playlists</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-full px-4 py-2 transition-colors"
        >
          <Plus size={16} />
          New Playlist
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createPlaylist()}
            placeholder="Playlist name"
            autoFocus
            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 placeholder-zinc-500"
          />
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 placeholder-zinc-500"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setName(''); setDesc('') }} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={createPlaylist} disabled={!name.trim() || creating} className="px-4 py-2 text-sm bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-semibold rounded-full transition-colors">
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-zinc-400 text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {likedPlaylist && (
            <Link href="/liked">
              <div className="bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 transition-colors cursor-pointer">
                <PlaylistCover thumbs={getTrackThumbnails(likedPlaylist)} isLiked />
                <p className="text-white text-sm font-semibold truncate">Liked Songs</p>
                <p className="text-zinc-400 text-xs mt-0.5">{trackCount(likedPlaylist)} songs</p>
              </div>
            </Link>
          )}

          {regularPlaylists.map(playlist => (
            <div key={playlist.id} className="group relative">
              <Link href={`/library/${playlist.id}`}>
                <div className="bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 transition-colors cursor-pointer">
                  <PlaylistCover thumbs={getTrackThumbnails(playlist)} />
                  <p className="text-white text-sm font-semibold truncate">{playlist.name}</p>
                  <p className="text-zinc-400 text-xs mt-0.5">{trackCount(playlist)} songs</p>
                </div>
              </Link>
              <button
                onClick={() => deletePlaylist(playlist.id)}
                className="absolute top-2 right-2 p-1.5 bg-zinc-900/80 rounded-full text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && playlists.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <ListMusic size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No playlists yet. Create one!</p>
        </div>
      )}
    </div>
  )
}
