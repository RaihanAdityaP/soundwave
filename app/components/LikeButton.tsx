'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { Track } from '@/types'
import { createClient } from '@/lib/supabase/client'

export default function LikeButton({ track }: { track: Track }) {
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkLiked()
  }, [track.id])

  async function checkLiked() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('liked_songs')
      .select('id')
      .eq('user_id', user.id)
      .eq('track_id', track.id)
      .single()

    setLiked(!!data)
  }

  async function toggleLike() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    if (liked) {
      await supabase
        .from('liked_songs')
        .delete()
        .eq('user_id', user.id)
        .eq('track_id', track.id)
      setLiked(false)
    } else {
      await supabase.from('liked_songs').insert({
        user_id: user.id,
        track_id: track.id,
        source: track.source,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: track.duration,
      })
      setLiked(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggleLike}
      disabled={loading}
      className={`p-1 rounded transition-colors ${
        liked ? 'text-green-500' : 'text-zinc-500 hover:text-white'
      }`}
    >
      <Heart size={16} className={liked ? 'fill-green-500' : ''} />
    </button>
  )
}