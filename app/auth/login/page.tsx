'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Music2 } from 'lucide-react'
import { login, resendVerification } from '../actions'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [showResend, setShowResend] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setShowResend(false)
    const formData = new FormData(e.currentTarget)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      if (result.error.toLowerCase().includes('email') && result.error.toLowerCase().includes('confirm')) {
        setShowResend(true)
      }
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!email) return
    setResendStatus('sending')
    const result = await resendVerification(email)
    if (result?.error) {
      setResendStatus('error')
    } else {
      setResendStatus('sent')
      setTimeout(() => setResendStatus('idle'), 5000)
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

        {/* Spotify login */}
        <a
          href="/auth/spotify"
          className="w-full flex items-center justify-center gap-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full py-3 text-sm transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black shrink-0">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          Continue with Spotify
        </a>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-black px-3 text-zinc-600">or continue with email</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest block mb-2">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          {showResend && (
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 space-y-2">
              <p className="text-zinc-400 text-xs">
                Email kamu belum diverifikasi. Kirim ulang link verifikasi?
              </p>
              {resendStatus === 'sent' && (
                <p className="text-green-400 text-xs">✓ Link verifikasi berhasil dikirim!</p>
              )}
              {resendStatus === 'error' && (
                <p className="text-red-400 text-xs">Gagal mengirim. Coba beberapa saat lagi.</p>
              )}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendStatus === 'sending' || resendStatus === 'sent'}
                className="text-xs text-green-400 hover:text-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors underline underline-offset-2"
              >
                {resendStatus === 'sending' ? 'Mengirim...' : 'Kirim Ulang Email Verifikasi'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold rounded-full py-3 text-sm transition-colors"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="space-y-3 text-center">
          <p className="text-zinc-500 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-white hover:text-green-400 transition-colors">
              Sign up
            </Link>
          </p>

          {!showResend && (
            <button
              type="button"
              onClick={() => setShowResend(true)}
              className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
            >
              Belum menerima email verifikasi?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}