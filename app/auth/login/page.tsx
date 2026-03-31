'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Music2 } from 'lucide-react'
import { login } from '../actions'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-white font-bold text-2xl mb-2">
            <Music2 className="text-green-500" size={32} />
            SoundWave
          </div>
          <p className="text-zinc-400 text-sm">Log in to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest block mb-2">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest block mb-2">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 px-4 py-3 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold rounded-full py-3 text-sm transition-colors"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-white hover:text-green-400 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}