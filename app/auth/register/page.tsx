'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Music2, Mail } from 'lucide-react'
import { register, resendVerification } from '../actions'

export default function RegisterPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [email, setEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  setLoading(true)
  setError('')
  const formData = new FormData(e.currentTarget)
  setEmail(formData.get('email') as string)
  const result = await register(formData)
  console.log('register result:', result) // ← tambah ini
  if (result?.error) {
    setError(result.error)
    setLoading(false)
  } else {
    setRegistered(true)
    setLoading(false)
  }
}

  async function handleResend() {
    setResendStatus('sending')
    const result = await resendVerification(email)
    if (result?.error) {
      setResendStatus('error')
    } else {
      setResendStatus('sent')
      // Reset ke idle setelah 5 detik
      setTimeout(() => setResendStatus('idle'), 5000)
    }
  }

  // ── Verification notice screen ──────────────────────────────────────────
  if (registered) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <Mail size={36} className="text-green-400" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-white font-bold text-2xl mb-2">Cek Email Kamu</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Kami telah mengirimkan link verifikasi ke
            </p>
            <p className="text-white font-medium text-sm mt-1 bg-zinc-800 rounded-lg px-4 py-2 inline-block">
              {email}
            </p>
          </div>

          {/* Steps */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left space-y-3">
            {[
              'Buka email yang kamu daftarkan',
              'Klik tombol "Verifikasi Email Saya"',
              'Kamu akan diarahkan ke SoundWave',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-zinc-300 text-sm">{step}</p>
              </div>
            ))}
          </div>

          {/* Resend section */}
          <div className="space-y-2">
            <p className="text-zinc-600 text-xs">
              Tidak menerima email? Cek folder spam atau kirim ulang.
            </p>

            {resendStatus === 'sent' && (
              <p className="text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2">
                ✓ Email verifikasi berhasil dikirim ulang!
              </p>
            )}

            {resendStatus === 'error' && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                Gagal mengirim ulang. Coba beberapa saat lagi.
              </p>
            )}

            <div className="flex gap-2 justify-center">
              <button
                onClick={handleResend}
                disabled={resendStatus === 'sending' || resendStatus === 'sent'}
                className="text-sm text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-full px-4 py-2 transition-colors"
              >
                {resendStatus === 'sending' ? 'Mengirim...' : 'Kirim Ulang Email'}
              </button>

              <button
                onClick={() => { setRegistered(false); setError(''); setResendStatus('idle') }}
                className="text-sm text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-full px-4 py-2 transition-colors"
              >
                Ganti Email
              </button>
            </div>
          </div>

          <Link
            href="/auth/login"
            className="block text-zinc-500 hover:text-white text-sm transition-colors"
          >
            Sudah verifikasi? Log in →
          </Link>
        </div>
      </div>
    )
  }

  // ── Register form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-white font-bold text-2xl mb-2">
            <Music2 className="text-green-500" size={32} />
            SoundWave
          </div>
          <p className="text-zinc-400 text-sm">Create your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest block mb-2">
              Username
            </label>
            <input
              name="username"
              type="text"
              required
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all"
              placeholder="yourname"
            />
          </div>

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
              minLength={6}
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
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-white hover:text-green-400 transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}