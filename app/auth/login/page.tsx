'use client'

import { useState } from 'react'
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
      // Kalau errornya soal email belum dikonfirmasi, tampilkan opsi resend
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

          {/* Resend verification section */}
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
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-white hover:text-green-400 transition-colors">
              Sign up
            </Link>
          </p>

          {/* Resend tanpa perlu login dulu */}
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