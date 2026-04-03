'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User, Heart, LogOut, Pencil, Check, X } from 'lucide-react'
import { updateProfile, logout } from '../../auth/actions'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface Props {
  user: SupabaseUser
  profile: { username: string | null; avatar_url: string | null } | null
  likedCount: number
}

export default function ProfileClient({ user, profile, likedCount }: Props) {
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState(profile?.username ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    const fd = new FormData()
    fd.append('username', username)
    const result = await updateProfile(fd)
    if (result?.error) setError(result.error)
    else setEditing(false)
    setSaving(false)
  }

  const initials = (profile?.username ?? user.email ?? '?')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="max-w-lg space-y-8">
      {/* Avatar + name */}
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-linear-to-br from-green-500 to-emerald-700 flex items-center justify-center text-black font-bold text-3xl shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Profile</p>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-zinc-800 text-white rounded-lg px-3 py-1.5 text-lg font-bold outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-full bg-green-500 hover:bg-green-400 text-black transition-colors disabled:opacity-50"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => { setEditing(false); setUsername(profile?.username ?? '') }}
                className="p-1.5 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white truncate">
                {profile?.username ?? user.email}
              </h1>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
          <p className="text-zinc-500 text-sm">{user.email}</p>
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/liked"
          className="bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-xl p-5 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Heart size={18} className="text-green-500" />
          </div>
          <div>
            <p className="text-white font-bold text-xl">{likedCount}</p>
            <p className="text-zinc-400 text-xs">Liked Songs</p>
          </div>
        </Link>

        <div className="bg-zinc-800 rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <User size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm truncate max-w-25">
              {user.email?.split('@')[0]}
            </p>
            <p className="text-zinc-400 text-xs">Member</p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <form action={logout}>
        <button
          type="submit"
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <LogOut size={16} />
          Log out
        </button>
      </form>
    </div>
  )
}