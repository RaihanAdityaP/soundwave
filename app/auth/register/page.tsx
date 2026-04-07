'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Music2, Mail, Eye, EyeOff } from 'lucide-react'
import { register, resendVerification } from '../actions'

export default function RegisterPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [email, setEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    setEmail(formData.get('email') as string)
    const result = await register(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setRegistered(true)
      setLoading(false)
    }
  }

  async function handleResend() {
    const emailToSend = email.trim()
    if (!emailToSend) {
      setResendStatus('error')
      return
    }
    setResendStatus('sending')
    const result = await resendVerification(emailToSend)
    if (result?.error) {
      setResendStatus('error')
    } else {
      setResendStatus('sent')
      setTimeout(() => setResendStatus('idle'), 5000)
    }
  }

  // ── Verification notice screen ─────────────────────────────────────────
  if (registered) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <Mail size={36} className="text-green-400" />
            </div>
          </div>

          <div>
            <h1 className="text-white font-bold text-2xl mb-2">Cek Email Kamu</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Kami telah mengirimkan link verifikasi ke
            </p>
            <p className="text-white font-medium text-sm mt-1 bg-zinc-800 rounded-lg px-4 py-2 inline-block">
              {email}
            </p>
          </div>

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
                type="button"
                onClick={handleResend}
                disabled={resendStatus === 'sending' || resendStatus === 'sent'}
                className="text-sm text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-full px-4 py-2 transition-colors"
                style={{ minHeight: 44 }}
              >
                {resendStatus === 'sending' ? 'Mengirim...' : 'Kirim Ulang Email'}
              </button>
              <button
                type="button"
                onClick={() => { setRegistered(false); setError(''); setResendStatus('idle') }}
                className="text-sm text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-full px-4 py-2 transition-colors"
                style={{ minHeight: 44 }}
              >
                Ganti Email
              </button>
            </div>
          </div>

          <Link
            href="/auth/login"
            className="block text-zinc-500 hover:text-white text-sm transition-colors py-2"
          >
            Sudah verifikasi? Log in →
          </Link>
        </div>
      </div>
    )
  }

  // ── Register form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-white font-bold text-2xl mb-2">
            <Music2 className="text-green-500" size={32} />
            SoundWave
          </div>
          <p className="text-zinc-400 text-sm">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest block mb-2">
              Username
            </label>
            <input
              name="username"
              type="text"
              required
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all"
              style={{ fontSize: 16 }}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all"
              style={{ fontSize: 16 }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest block mb-2">
              Password
            </label>
            {/* Wrapper div bukan relative input — supaya button eye TIDAK pernah trigger submit */}
            <div className="relative flex items-center">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                style={{ fontSize: 16 }}
                placeholder="••••••••"
              />
              {/* 
                PENTING: type="button" wajib ada supaya tidak trigger form submit.
                onMouseDown preventDefault supaya input tidak kehilangan focus.
              */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-white transition-colors rounded"
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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