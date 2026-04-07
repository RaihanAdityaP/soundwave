'use client'

import { useState, useEffect } from 'react'
import { Heart, ListPlus, X, Check, Trash2, Gamepad2 } from 'lucide-react'
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
  onRemove?: () => void
  onPlayRhythm?: () => void
}

export default function TrackMenu({ track, onClose, onRemove, onPlayRhythm }: Props) {
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

  // Lock body scroll while menu is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

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

    if (isRemoving) {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id }),
      })
      const payload = await res.json()
      if (!res.ok) { setActionMessage(payload.error ?? 'Failed to remove track.'); setToggling(null); return }
      setAdded(prev => prev.filter(id => id !== playlistId))
      setActionMessage(payload.message ?? 'Removed from playlist.')
    } else {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(track),
      })
      const payload = await res.json()
      if (!res.ok) { setActionMessage(payload.error ?? 'Failed to add track.'); setToggling(null); return }
      setAdded(prev => [...prev, playlistId])
      setActionMessage(payload.message ?? 'Added to playlist.')
      router.refresh()
    }

    if (likedPlaylist?.id === playlistId) {
      setActionMessage(isRemoving ? 'Removed from Liked Songs.' : 'Added to Liked Songs.')
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
    // z-[110] → di atas mobile nav (z-40) dan player bar (z-30)
    <div
      className="fixed inset-0 z-110 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      style={{ touchAction: 'none' }}
    >
      <div
        className="w-full max-w-lg bg-zinc-900 rounded-t-2xl flex flex-col"
        style={{
          maxHeight: '85dvh',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Track info — pinned, tidak scroll */}
        <div className="flex items-center gap-3 px-5 pt-3 pb-4 border-b border-zinc-800 shrink-0">
          <img
            src={track.thumbnail}
            alt=""
            className="w-12 h-12 rounded object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm truncate">{track.title}</p>
            <p className="text-zinc-400 text-xs truncate">{track.artist}</p>
          </div>
          {/* Touch target 44×44 */}
          <button
            onClick={onClose}
            className="flex items-center justify-center text-zinc-500 active:text-white shrink-0 rounded-full"
            style={{ width: 44, height: 44, touchAction: 'manipulation' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {view === 'menu' ? (
            <div className="py-2">

              {/* Rhythm Game */}
              {onPlayRhythm && (
                <button
                  onClick={() => { onClose(); onPlayRhythm() }}
                  className="w-full flex items-center gap-4 px-5 active:bg-zinc-800 transition-colors text-left"
                  style={{ minHeight: 56, touchAction: 'manipulation' }}
                >
                  <Gamepad2 size={22} className="text-green-500 shrink-0" />
                  <div>
                    <span className="text-white text-sm block">Play Rhythm Game</span>
                    <span className="text-zinc-500 text-xs">Tap to the beat</span>
                  </div>
                </button>
              )}

              {/* Like */}
              <button
                onClick={() => likedPlaylist && togglePlaylist(likedPlaylist.id)}
                disabled={!likedPlaylist || toggling === likedPlaylist?.id}
                className="w-full flex items-center gap-4 px-5 active:bg-zinc-800 transition-colors text-left disabled:opacity-50"
                style={{ minHeight: 56, touchAction: 'manipulation' }}
              >
                <Heart
                  size={22}
                  className={`shrink-0 ${isLiked ? 'text-green-500 fill-green-500' : 'text-zinc-300'}`}
                />
                <span className="text-white text-sm">
                  {isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                </span>
                {toggling === likedPlaylist?.id && (
                  <span className="ml-auto w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </button>

              {actionMessage && (
                <p className="px-5 pb-1 text-xs text-green-400">{actionMessage}</p>
              )}

              {/* Add to playlist */}
              <button
                onClick={() => setView('playlists')}
                className="w-full flex items-center gap-4 px-5 active:bg-zinc-800 transition-colors text-left"
                style={{ minHeight: 56, touchAction: 'manipulation' }}
              >
                <ListPlus size={22} className="text-zinc-300 shrink-0" />
                <span className="text-white text-sm">Add to playlist</span>
              </button>

              {/* Remove from playlist */}
              {onRemove && (
                <button
                  onClick={() => { onRemove(); onClose() }}
                  className="w-full flex items-center gap-4 px-5 active:bg-zinc-800 transition-colors text-left"
                  style={{ minHeight: 56, touchAction: 'manipulation' }}
                >
                  <Trash2 size={22} className="text-red-400 shrink-0" />
                  <span className="text-red-400 text-sm">Remove from this playlist</span>
                </button>
              )}
            </div>

          ) : (
            /* Playlist picker */
            <div>
              <div
                className="flex items-center gap-3 px-5 border-b border-zinc-800"
                style={{ minHeight: 48 }}
              >
                <button
                  onClick={() => setView('menu')}
                  className="text-zinc-400 active:text-white text-sm py-3 pr-3"
                  style={{ touchAction: 'manipulation' }}
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
                    className="flex-1 bg-zinc-800 text-white rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 placeholder-zinc-500"
                    // font-size 16px → cegah iOS auto-zoom saat input focus
                    style={{ fontSize: 16 }}
                  />
                  <button
                    onClick={createAndAdd}
                    disabled={!newName.trim() || creatingNew}
                    className="px-3 py-2 bg-green-500 active:bg-green-400 disabled:opacity-40 text-black text-sm font-semibold rounded-lg transition-colors"
                    style={{ touchAction: 'manipulation' }}
                  >
                    {creatingNew ? '...' : 'Create'}
                  </button>
                </div>
              </div>

              {/* Playlist list */}
              <div>
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
                        className="w-full flex items-center gap-3 px-5 active:bg-zinc-800 transition-colors text-left disabled:opacity-50"
                        style={{ minHeight: 56, touchAction: 'manipulation' }}
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
    </div>
  )
}