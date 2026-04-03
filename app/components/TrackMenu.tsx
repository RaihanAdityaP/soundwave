'use client'

import { useState, useEffect } from 'react'
import { Heart, ListPlus, X, Check, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Track } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface Playlist {
  id: string
  name: string
  is_liked_songs: boolean
  playlist_tracks: { count: number }[]
}

interface Props {
  track: Track
  onClose: () => void
  onRemove?: () => void // kalau dipanggil dari halaman playlist
}

export default function TrackMenu({ track, onClose, onRemove }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState<string[]>([])
  const [toggling, setToggling] = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [view, setView] = useState<'menu' | 'playlists'>('menu')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('playlists')
        .select('id, name, is_liked_songs, playlist_tracks(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const list = data ?? []
      setPlaylists(list)

      if (list.length) {
        const { data: existing } = await supabase
          .from('playlist_tracks')
          .select('playlist_id')
          .eq('track_id', track.id)
          .in('playlist_id', list.map(p => p.id))
        setAdded(existing?.map(e => e.playlist_id) ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function togglePlaylist(playlistId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setActionMessage(null)
    setToggling(playlistId)
    const isRemoving = added.includes(playlistId)
    
    if (added.includes(playlistId)) {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id }),
      })
      const payload = await res.json()
      if (!res.ok) {
        setActionMessage(payload.error ?? 'Failed to remove track.')
        setToggling(null)
        return
      }
      setAdded(prev => prev.filter(id => id !== playlistId))
      setActionMessage(payload.message ?? 'Track removed from playlist.')
    } else {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(track),
      })
      const payload = await res.json()
      if (!res.ok) {
        setActionMessage(payload.error ?? 'Failed to add track.')
        setToggling(null)
        return
      }
      setAdded(prev => [...prev, playlistId])
      setActionMessage(payload.message ?? 'Track added to playlist.')
      router.refresh()
    }

    if (likedPlaylist?.id === playlistId) {
      setActionMessage(
        isRemoving
          ? 'Removed from Liked Songs.'
          : 'Added to Liked Songs.'
      )
    }
    setToggling(null)
  }

  async function createAndAdd() {
    if (!newName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setCreatingNew(true)
    const { data: newPlaylist } = await supabase
      .from('playlists')
      .insert({ user_id: user.id, name: newName.trim() })
      .select('id, name, is_liked_songs, playlist_tracks(count)')
      .single()

    if (newPlaylist) {
      setPlaylists(prev => [newPlaylist, ...prev])
      await togglePlaylist(newPlaylist.id)
    }
    setNewName('')
    setCreatingNew(false)
  }

  const likedPlaylist = playlists.find(p => p.is_liked_songs)
  const isLiked = likedPlaylist ? added.includes(likedPlaylist.id) : false

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-zinc-900 rounded-t-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Track info */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-zinc-800">
          <img
            src={track.thumbnail}
            alt=""
            className="w-12 h-12 rounded object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm truncate">{track.title}</p>
            <p className="text-zinc-400 text-xs truncate">{track.artist}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white shrink-0">
            <X size={20} />
          </button>
        </div>

        {view === 'menu' ? (
          <div className="py-2">
            {/* Like */}
            <button
              onClick={() => likedPlaylist && togglePlaylist(likedPlaylist.id)}
              disabled={!likedPlaylist || toggling === likedPlaylist?.id}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800 transition-colors text-left"
            >
              <Heart
                size={22}
                className={isLiked ? 'text-green-500 fill-green-500' : 'text-zinc-300'}
              />
              <span className="text-white text-sm">
                {isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
              </span>
            </button>

            {actionMessage && (
              <p className="px-5 pb-2 text-xs text-green-400">{actionMessage}</p>
            )}

            {/* Add to playlist */}
            <button
              onClick={() => setView('playlists')}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800 transition-colors text-left"
            >
              <ListPlus size={22} className="text-zinc-300" />
              <span className="text-white text-sm">Add to playlist</span>
            </button>

            {/* Remove from playlist (opsional, dari halaman detail playlist) */}
            {onRemove && (
              <button
                onClick={() => { onRemove(); onClose() }}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800 transition-colors text-left"
              >
                <Trash2 size={22} className="text-red-400" />
                <span className="text-red-400 text-sm">Remove from this playlist</span>
              </button>
            )}
          </div>
        ) : (
          /* Playlist picker */
          <div>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800">
              <button
                onClick={() => setView('menu')}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ← Back
              </button>
              <span className="text-white font-semibold text-sm">Add to playlist</span>
            </div>

            {/* Create new */}
            <div className="px-5 py-3 border-b border-zinc-800/50">
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createAndAdd()}
                  placeholder="New playlist name..."
                  className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 placeholder-zinc-500"
                />
                <button
                  onClick={createAndAdd}
                  disabled={!newName.trim() || creatingNew}
                  className="px-3 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black text-sm font-semibold rounded-lg transition-colors"
                >
                  {creatingNew ? '...' : 'Create'}
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto pb-4">
              {loading ? (
                <p className="text-zinc-500 text-sm text-center py-6">Loading...</p>
              ) : (
                playlists.map(playlist => {
                  const isAdded = added.includes(playlist.id)
                  const isToggling = toggling === playlist.id
                  return (
                    <button
                      key={playlist.id}
                      onClick={() => togglePlaylist(playlist.id)}
                      disabled={isToggling}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-zinc-800 transition-colors text-left"
                    >
                      <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
                        playlist.is_liked_songs
                          ? 'bg-linear-to-br from-purple-600 to-blue-500'
                          : 'bg-zinc-700'
                      }`}>
                        {playlist.is_liked_songs
                          ? <Heart size={14} className="text-white fill-white" />
                          : <span className="text-zinc-400 text-xs font-bold">
                              {playlist.name.slice(0, 2).toUpperCase()}
                            </span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{playlist.name}</p>
                      </div>
                      {isToggling ? (
                        <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : isAdded ? (
                        <Check size={18} className="text-green-500 shrink-0" />
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}