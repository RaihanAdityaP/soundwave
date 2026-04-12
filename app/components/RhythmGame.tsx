'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronDown, Music2, AlertCircle } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'

// ── Types ────────────────────────────────────────────────────────────────────

type CircleNote = {
  id: number
  x: number
  y: number
  spawnTime: number
  hitWindow: number
  hit: boolean
  missed: boolean
}

type LaneNote = {
  id: number
  lane: 0 | 1 | 2 | 3
  y: number
  spawnTime: number
  hit: boolean
  missed: boolean
}

type HitEffect = {
  id: number
  x: number
  y: number
  type: 'perfect' | 'good' | 'miss'
  createdAt: number
}

type LaneEffect = {
  id: number
  lane: 0 | 1 | 2 | 3
  type: 'perfect' | 'good' | 'miss'
  createdAt: number
}

type GameState = 'idle' | 'countdown' | 'playing' | 'result'
type GameMode = 'circle' | 'lane'
type PendingGameState = { _fallback: ReturnType<typeof setTimeout> | null }

// ── Constants ────────────────────────────────────────────────────────────────

const LANE_KEYS = ['d', 'f', 'j', 'k']
const LANE_LABELS = ['D', 'F', 'J', 'K']
const CIRCLE_HIT_WINDOW = 400
const LANE_TRAVEL_TIME = 1200
const PERFECT_THRESHOLD = 80
const GOOD_THRESHOLD = 200
const EFFECT_DURATION = 600
const DEFAULT_GAME_DURATION = 60
const PERFECT_ACCURACY_POINTS = 100
const GOOD_ACCURACY_POINTS = 70
const BAD_PRESS_PENALTY = 20
const MISS_SCORE_PENALTY = 120
const BAD_PRESS_SCORE_PENALTY = 80
const DEFAULT_BPM = 128
const MIN_BPM = 60
const MAX_BPM = 200

// Note harus sudah mencapai minimal 78% perjalanan sebelum bisa di-hit
// Fix: "stuck kalau dipencet sebelum note sampai bawah"
const LANE_HIT_ZONE_MIN = 0.78

// Cooldown per-lane (ms): cegah spam penalty saat tidak ada note
const LANE_PRESS_COOLDOWN_MS = 400

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRating(accuracy: number) {
  if (accuracy >= 95) return { label: 'S', color: '#22c55e' }
  if (accuracy >= 85) return { label: 'A', color: '#86efac' }
  if (accuracy >= 70) return { label: 'B', color: '#fbbf24' }
  if (accuracy >= 50) return { label: 'C', color: '#f97316' }
  return { label: 'D', color: '#ef4444' }
}

function hashSeed(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function createPrng(seed: number) {
  let t = seed || 1
  return () => {
    t += 0x6D2B79F5
    let n = Math.imul(t ^ (t >>> 15), t | 1)
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61)
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
}

function generateBeats(durationSec: number, bpm: number, seedKey: string): number[] {
  const safeBpm = Math.min(MAX_BPM, Math.max(MIN_BPM, bpm))
  const interval = 60000 / safeBpm
  const rand = createPrng(hashSeed(seedKey))
  const beats: number[] = []
  for (let t = 1000; t < durationSec * 1000; t += interval) {
    beats.push(t)
    const halfBeatChance = safeBpm > 140 ? 0.25 : 0.4
    if (rand() > (1 - halfBeatChance)) beats.push(t + interval / 2)
  }
  return beats.sort((a, b) => a - b)
}

// Web Audio feedback — oscillator only, tidak tap ke stream eksternal
function playHitSound(ctx: AudioContext, type: 'perfect' | 'good' | 'miss' | 'bad') {
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type === 'bad' ? 'sawtooth' : 'sine'
    osc.frequency.value = type === 'perfect' ? 880 : type === 'good' ? 660 : type === 'miss' ? 220 : 150
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (type === 'bad' ? 0.08 : 0.12))
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.13)
  } catch {}
}

// ── Component ────────────────────────────────────────────────────────────────

export default function RhythmGame({ onClose }: { onClose: () => void }) {
  const { currentTrack, seekTo, setIsPlaying, resolving, setOnAudioPlaying } = usePlayerStore()

  const [gameState, setGameState] = useState<GameState>('idle')
  const [countdown, setCountdown] = useState(3)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [totalNotes, setTotalNotes] = useState(0)
  const [hitNotes, setHitNotes] = useState(0)
  const [perfectHits, setPerfectHits] = useState(0)
  const [missNotes, setMissNotes] = useState(0)
  const [accuracyPoints, setAccuracyPoints] = useState(0)
  const [maxAccuracyPoints, setMaxAccuracyPoints] = useState(0)
  const [penaltyPoints, setPenaltyPoints] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [gameBpm, setGameBpm] = useState<number>(DEFAULT_BPM)
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(false)

  const [circleNotes, setCircleNotes] = useState<CircleNote[]>([])
  const [laneNotes, setLaneNotes] = useState<LaneNote[]>([])
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([])
  const [laneEffects, setLaneEffects] = useState<LaneEffect[]>([])
  const [pressedLanes, setPressedLanes] = useState<boolean[]>([false, false, false, false])

  const gameStartTimeRef = useRef<number>(0)
  const beatsRef = useRef<number[]>([])
  const nextBeatIdxRef = useRef(0)
  const noteIdRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const gameDurationRef = useRef<number>(DEFAULT_GAME_DURATION)
  const gameModeRef = useRef<GameMode>('circle')
  const rngRef = useRef<() => number>(() => Math.random())
  const gameAreaRef = useRef<HTMLDivElement>(null)

  // Score refs (stale closure fix)
  const comboRef = useRef(0)
  const scoreRef = useRef(0)
  const hitNotesRef = useRef(0)
  const perfectHitsRef = useRef(0)
  const missNotesRef = useRef(0)
  const totalNotesRef = useRef(0)
  const accuracyPointsRef = useRef(0)
  const maxAccuracyPointsRef = useRef(0)
  const penaltyPointsRef = useRef(0)

  // Lane press tracking
  const laneLastPressRef = useRef<number[]>([-Infinity, -Infinity, -Infinity, -Infinity])
  const laneHitInProgressRef = useRef<boolean[]>([false, false, false, false])

  const audioCtxRef = useRef<AudioContext | null>(null)

  const seekToRef = useRef(seekTo)
  const setIsPlayingRef = useRef(setIsPlaying)
  useEffect(() => { seekToRef.current = seekTo }, [seekTo])
  useEffect(() => { setIsPlayingRef.current = setIsPlaying }, [setIsPlaying])

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingGameRef = useRef<PendingGameState>({ _fallback: null })

  // ── Mount: pause musik saat game dibuka ──────────────────────────────────
  useEffect(() => {
    // Fix #2: lagu tetap muter saat idle di rhythm game screen
    setIsPlayingRef.current(false)
    const t = setTimeout(() => setMounted(true), 30)
    return () => {
      clearTimeout(t)
      setOnAudioPlaying(null)
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { stopGame(); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const initAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new AudioContext()
        setAudioEnabled(true)
      } catch {}
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
      setAudioEnabled(true)
    }
  }, [])

  // ── Game loop ─────────────────────────────────────────────────────────────
  const gameLoopRef = useRef<() => void>(() => {})

  gameLoopRef.current = () => {
    const now = performance.now()
    const elapsed = now - gameStartTimeRef.current

    if (elapsed >= gameDurationRef.current * 1000) {
      setGameState('result')
      return
    }

    // Spawn notes
    while (
      nextBeatIdxRef.current < beatsRef.current.length &&
      beatsRef.current[nextBeatIdxRef.current] <= elapsed + LANE_TRAVEL_TIME
    ) {
      const beatTime = beatsRef.current[nextBeatIdxRef.current]
      const id = noteIdRef.current++
      const isLane = gameModeRef.current === 'lane'
      totalNotesRef.current++
      setTotalNotes(totalNotesRef.current)
      maxAccuracyPointsRef.current += PERFECT_ACCURACY_POINTS
      setMaxAccuracyPoints(maxAccuracyPointsRef.current)

      if (isLane) {
        const lane = Math.floor(rngRef.current() * 4) as 0 | 1 | 2 | 3
        setLaneNotes(prev => [...prev, { id, lane, y: 0, spawnTime: beatTime, hit: false, missed: false }])
      } else {
        const area = gameAreaRef.current
        const w = area?.clientWidth ?? 600
        const h = area?.clientHeight ?? 400
        setCircleNotes(prev => [...prev, {
          id,
          x: 48 + rngRef.current() * Math.max(0, w - 96),
          y: 48 + rngRef.current() * Math.max(0, (h - 120) - 96),
          spawnTime: beatTime,
          hitWindow: CIRCLE_HIT_WINDOW,
          hit: false,
          missed: false,
        }])
      }
      nextBeatIdxRef.current++
    }

    // Circle miss check
    setCircleNotes(prev => {
      const el = performance.now() - gameStartTimeRef.current
      return prev
        .map(n => {
          if (n.hit) return n
          const age = el - n.spawnTime
          if (!n.missed && age > n.hitWindow + PERFECT_THRESHOLD) {
            missNotesRef.current++
            setMissNotes(missNotesRef.current)
            comboRef.current = 0; setCombo(0)
            scoreRef.current = Math.max(0, scoreRef.current - MISS_SCORE_PENALTY)
            setScore(scoreRef.current)
            return { ...n, missed: true }
          }
          return n
        })
        .filter(n => {
          const age = performance.now() - gameStartTimeRef.current - n.spawnTime
          return n.missed ? age < n.hitWindow + 800 : true
        })
    })

    // Lane position update + miss check
    setLaneNotes(prev => {
      const el = performance.now() - gameStartTimeRef.current
      return prev
        .map(n => {
          if (n.hit) {
            // tetap turun sebentar setelah di-hit biar tidak terlihat "freeze" di posisi lama
            return { ...n, y: Math.min(1, n.y + 0.14) }
          }
          if (n.missed) return n
          const age = el - n.spawnTime
          const progress = Math.min(age / LANE_TRAVEL_TIME, 1)
          if (age > LANE_TRAVEL_TIME + GOOD_THRESHOLD) {
            comboRef.current = 0; setCombo(0)
            missNotesRef.current++; setMissNotes(missNotesRef.current)
            scoreRef.current = Math.max(0, scoreRef.current - MISS_SCORE_PENALTY)
            setScore(scoreRef.current)
            return { ...n, missed: true, y: 1 }
          }
          return { ...n, y: progress }
        })
        .filter(n => {
          if (n.hit) {
            const age = performance.now() - gameStartTimeRef.current - n.spawnTime
            return age < LANE_TRAVEL_TIME + 240
          }
          if (n.missed) {
            const age = performance.now() - gameStartTimeRef.current - n.spawnTime
            return age < LANE_TRAVEL_TIME + 800
          }
          return true
        })
    })

    setHitEffects(prev => {
      const el = performance.now() - gameStartTimeRef.current
      return prev.filter(e => el - e.createdAt < EFFECT_DURATION)
    })
    setLaneEffects(prev => {
      const el = performance.now() - gameStartTimeRef.current
      return prev.filter(e => el - e.createdAt < EFFECT_DURATION)
    })

    rafRef.current = requestAnimationFrame(() => gameLoopRef.current())
  }

  // ── Start game loop ───────────────────────────────────────────────────────
  const startGameLoop = useCallback((durationSec: number, bpm: number) => {
    if (pendingGameRef.current._fallback) {
      clearTimeout(pendingGameRef.current._fallback)
      pendingGameRef.current._fallback = null
    }
    const seedKey = `${currentTrack?.id ?? 'track'}-${gameModeRef.current}-${bpm}-${durationSec}`
    beatsRef.current = generateBeats(durationSec, bpm, seedKey)
    gameStartTimeRef.current = performance.now()
    setGameState('playing')
    rafRef.current = requestAnimationFrame(() => gameLoopRef.current())
    setOnAudioPlaying(null)
  }, [currentTrack?.id])

  // ── Start countdown ───────────────────────────────────────────────────────
  const startGame = useCallback((mode: GameMode) => {
    initAudioContext()
    setSelectedMode(mode)
    gameModeRef.current = mode

    const bpm = currentTrack?.bpm && currentTrack.bpm > 0 ? currentTrack.bpm : DEFAULT_BPM
    const safeBpm = Math.min(MAX_BPM, Math.max(MIN_BPM, bpm))
    const durationSec = currentTrack?.duration && currentTrack.duration > 0
      ? Math.max(30, Math.min(360, currentTrack.duration))
      : DEFAULT_GAME_DURATION
    gameDurationRef.current = durationSec

    rngRef.current = createPrng(hashSeed(`${currentTrack?.id ?? 'track'}-${mode}-${safeBpm}-${durationSec}`))
    setGameBpm(safeBpm)

    laneLastPressRef.current = [-Infinity, -Infinity, -Infinity, -Infinity]
    laneHitInProgressRef.current = [false, false, false, false]
    setOnAudioPlaying(null)
    setIsPlayingRef.current(false)
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }

    setGameState('countdown')
    setCountdown(3)
    setScore(0); setCombo(0); setMaxCombo(0)
    setTotalNotes(0); setHitNotes(0); setPerfectHits(0); setMissNotes(0)
    setAccuracyPoints(0); setMaxAccuracyPoints(0); setPenaltyPoints(0)
    setCircleNotes([]); setLaneNotes([]); setHitEffects([]); setLaneEffects([])
    setPressedLanes([false, false, false, false])

    comboRef.current = 0; scoreRef.current = 0
    hitNotesRef.current = 0; perfectHitsRef.current = 0
    missNotesRef.current = 0; totalNotesRef.current = 0
    accuracyPointsRef.current = 0; maxAccuracyPointsRef.current = 0
    penaltyPointsRef.current = 0; noteIdRef.current = 0; nextBeatIdxRef.current = 0
    
    let c = 3
    const interval = setInterval(() => {
      c--
      setCountdown(c)
      if (c <= 0) {
        clearInterval(interval)
        countdownIntervalRef.current = null
        beginPlaying(durationSec, safeBpm)
      }
    }, 1000)
    countdownIntervalRef.current = interval
  }, [currentTrack, initAudioContext])

  // Start playback tepat saat countdown selesai (tanpa muter saat countdown)
  const beginPlaying = useCallback((durationSec: number, bpm: number) => {
    if (pendingGameRef.current._fallback) {
      clearTimeout(pendingGameRef.current._fallback)
      pendingGameRef.current._fallback = null
    }

    setOnAudioPlaying(() => () => {
      startGameLoop(durationSec, bpm)
    })
    seekToRef.current?.(0)
    setIsPlayingRef.current(true)

    // Fallback kalau event "playing" terlambat / tidak terpanggil
    const fallback = setTimeout(() => {
      setOnAudioPlaying(null)
      startGameLoop(durationSec, bpm)
    }, 1500)
    pendingGameRef.current._fallback = fallback
  }, [startGameLoop])

  const stopGame = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setOnAudioPlaying(null)
    if (pendingGameRef.current._fallback) {
      clearTimeout(pendingGameRef.current._fallback)
      pendingGameRef.current._fallback = null
    }
  }, [])

  // ── Circle hit ────────────────────────────────────────────────────────────
  const handleCircleClick = useCallback((note: CircleNote, e: React.MouseEvent) => {
    e.stopPropagation()
    const elapsed = performance.now() - gameStartTimeRef.current
    const age = elapsed - note.spawnTime
    const diff = Math.abs(age - note.hitWindow / 2)

    let type: 'perfect' | 'good' | 'miss' = 'miss'
    let pts = 0
    if (diff < PERFECT_THRESHOLD) { type = 'perfect'; pts = 300 }
    else if (diff < GOOD_THRESHOLD) { type = 'good'; pts = 100 }

    if (type !== 'miss') {
      comboRef.current++
      setCombo(comboRef.current)
      setMaxCombo(prev => Math.max(prev, comboRef.current))
      hitNotesRef.current++; setHitNotes(hitNotesRef.current)
      const gain = type === 'perfect' ? PERFECT_ACCURACY_POINTS : GOOD_ACCURACY_POINTS
      accuracyPointsRef.current += gain; setAccuracyPoints(accuracyPointsRef.current)
      if (type === 'perfect') { perfectHitsRef.current++; setPerfectHits(perfectHitsRef.current) }
    } else {
      comboRef.current = 0; setCombo(0)
      missNotesRef.current++; setMissNotes(missNotesRef.current)
      scoreRef.current = Math.max(0, scoreRef.current - MISS_SCORE_PENALTY)
      setScore(scoreRef.current)
    }

    if (audioCtxRef.current) playHitSound(audioCtxRef.current, type)

    const bonus = Math.floor(pts * (1 + comboRef.current * 0.1))
    scoreRef.current += bonus; setScore(scoreRef.current)
    setCircleNotes(prev => prev.map(n => n.id === note.id ? { ...n, hit: true } : n))
    setHitEffects(prev => [...prev, { id: Date.now(), x: note.x, y: note.y, type, createdAt: elapsed }])
  }, [])

  // ── Lane key handler ──────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'playing' || gameModeRef.current !== 'lane') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return  // abaikan auto-repeat
      const laneIdx = LANE_KEYS.indexOf(e.key.toLowerCase())
      if (laneIdx === -1) return
      e.preventDefault()

      // Cegah double-hit dalam window 50ms
      if (laneHitInProgressRef.current[laneIdx]) return
      laneHitInProgressRef.current[laneIdx] = true
      setTimeout(() => { laneHitInProgressRef.current[laneIdx] = false }, 50)

      setPressedLanes(prev => { const next = [...prev]; next[laneIdx] = true; return next })

      const now = performance.now()
      const elapsed = now - gameStartTimeRef.current

      setLaneNotes(prev => {
        // Kandidat: note yang sudah masuk hit zone (y >= LANE_HIT_ZONE_MIN)
        const candidates = prev.filter(
          n => !n.hit && !n.missed && n.lane === laneIdx && n.y >= LANE_HIT_ZONE_MIN
        )

        if (candidates.length === 0) {
          // Cek note yang sedang turun tapi belum masuk hit zone
          const comingNotes = prev.filter(
            n => !n.hit && !n.missed && n.lane === laneIdx && n.y > 0 && n.y < LANE_HIT_ZONE_MIN
          )

          if (comingNotes.length > 0) {
            // Note ada tapi belum sampai — ABAIKAN, tidak ada penalty
            // Fix #1: "stuck kalau dipencet sebelum note sampai bawah"
            return prev
          }

          // Tidak ada note aktif — penalty hanya kalau cooldown lewat
          const cooldownOk = now - laneLastPressRef.current[laneIdx] > LANE_PRESS_COOLDOWN_MS
          if (!cooldownOk) return prev

          laneLastPressRef.current[laneIdx] = now
          setLaneEffects(eff => [...eff, {
            id: Date.now(), lane: laneIdx as 0|1|2|3, type: 'miss', createdAt: elapsed,
          }])
          comboRef.current = 0; setCombo(0)
          penaltyPointsRef.current += BAD_PRESS_PENALTY; setPenaltyPoints(penaltyPointsRef.current)
          scoreRef.current = Math.max(0, scoreRef.current - BAD_PRESS_SCORE_PENALTY)
          setScore(scoreRef.current)
          if (audioCtxRef.current) playHitSound(audioCtxRef.current, 'bad')
          return prev
        }

        laneLastPressRef.current[laneIdx] = now

        // Note terdekat hit line
        const target = candidates.reduce((a, b) =>
          Math.abs(a.y - 1) < Math.abs(b.y - 1) ? a : b
        )
        const diff = Math.abs(target.y - 1)

        let type: 'perfect' | 'good' | 'miss' = 'miss'
        let pts = 0
        if (diff < 0.08) { type = 'perfect'; pts = 300 }
        else if (diff < 0.18) { type = 'good'; pts = 100 }

        if (type !== 'miss') {
          comboRef.current++
          setCombo(comboRef.current)
          setMaxCombo(p => Math.max(p, comboRef.current))
          hitNotesRef.current++; setHitNotes(hitNotesRef.current)
          const gain = type === 'perfect' ? PERFECT_ACCURACY_POINTS : GOOD_ACCURACY_POINTS
          accuracyPointsRef.current += gain; setAccuracyPoints(accuracyPointsRef.current)
          if (type === 'perfect') { perfectHitsRef.current++; setPerfectHits(p => p + 1) }
        } else {
          comboRef.current = 0; setCombo(0)
          missNotesRef.current++; setMissNotes(missNotesRef.current)
          scoreRef.current = Math.max(0, scoreRef.current - MISS_SCORE_PENALTY)
          setScore(scoreRef.current)
        }

        if (audioCtxRef.current) playHitSound(audioCtxRef.current, type)

        const bonus = Math.floor(pts * (1 + comboRef.current * 0.1))
        scoreRef.current += bonus; setScore(scoreRef.current)
        setLaneEffects(eff => [...eff, {
          id: Date.now(), lane: laneIdx as 0|1|2|3, type, createdAt: elapsed,
        }])
        return prev.map(n => n.id === target.id ? { ...n, hit: true, y: Math.max(n.y, 1) } : n)
      })
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const laneIdx = LANE_KEYS.indexOf(e.key.toLowerCase())
      if (laneIdx === -1) return
      setPressedLanes(prev => { const next = [...prev]; next[laneIdx] = false; return next })
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameState])

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    if (pendingGameRef.current._fallback) clearTimeout(pendingGameRef.current._fallback)
    setOnAudioPlaying(null)
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────
  const rawAccuracy = maxAccuracyPoints > 0
    ? ((accuracyPoints - penaltyPoints) / maxAccuracyPoints) * 100
    : 100
  const accuracy = Math.max(0, Math.min(100, Math.round(rawAccuracy)))
  const elapsed2 = gameState === 'playing' ? performance.now() - gameStartTimeRef.current : 0
  const totalDuration = gameDurationRef.current
  const timeLeft = Math.max(0, totalDuration - Math.floor(elapsed2 / 1000))
  const rating = getRating(accuracy)
  const trackBpm = currentTrack?.bpm && currentTrack.bpm > 0 ? currentTrack.bpm : null

  // Fix #3: YouTube tracks tidak support seekTo di awal, disable rhythm game
  const isYouTubeTrack = currentTrack?.source === 'youtube'
  const canStartGame = !resolving && !!seekTo && !isYouTubeTrack

  if (!currentTrack) return null

  return (
    <div
      className={`fixed inset-0 z-60 flex flex-col transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: '#09090b' }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 scale-110"
          style={{
            backgroundImage: `url(${currentTrack.thumbnail})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(40px) brightness(0.15)',
          }}
        />
      </div>
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(34,197,94,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
        <button
          onClick={() => { stopGame(); onClose() }}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
        >
          <ChevronDown size={20} className="group-hover:translate-y-0.5 transition-transform" />
          <span className="text-sm font-medium tracking-wide">Exit</span>
        </button>
        <div className="flex items-center gap-2">
          <Music2 size={14} className="text-green-500" />
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold">Rhythm</span>
          {gameState === 'playing' && trackBpm && (
            <span className="text-xs text-zinc-600 font-mono ml-1">{gameBpm} BPM</span>
          )}
        </div>
        <button
          onClick={() => { stopGame(); onClose() }}
          className="p-2 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Score bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-2 shrink-0">
        <div className="w-32">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Score</p>
          <p className="text-2xl font-bold text-white tabular-nums leading-tight">{score.toLocaleString()}</p>
        </div>
        <div className="text-center">
          {combo > 1 && (
            <div key={combo} style={{ animation: 'comboIn 0.15s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <p
                className="font-black tabular-nums leading-none"
                style={{
                  fontSize: Math.min(48, 24 + combo * 0.5) + 'px',
                  color: combo >= 20 ? '#22c55e' : combo >= 10 ? '#86efac' : '#d4d4d8',
                  textShadow: combo >= 20 ? '0 0 20px rgba(34,197,94,0.6)' : 'none',
                }}
              >
                {combo}×
              </p>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">combo</p>
            </div>
          )}
        </div>
        <div className="w-32 text-right">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">
            {gameState === 'playing' ? `${timeLeft}s` : 'Accuracy'}
          </p>
          <p className="text-2xl font-bold tabular-nums leading-tight" style={{ color: '#22c55e' }}>{accuracy}%</p>
        </div>
      </div>

      {gameState === 'playing' && (
        <div className="relative z-10 px-8 shrink-0">
          <div className="h-0.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-1000"
              style={{ width: `${((totalDuration - timeLeft) / totalDuration) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Game area */}
      <div ref={gameAreaRef} className="relative z-10 flex-1 overflow-hidden">

        {/* ── IDLE ── */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-8">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <Image src={currentTrack.thumbnail} alt="" fill className="object-cover" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">{currentTrack.title}</p>
              <p className="text-zinc-400 text-sm">{currentTrack.artist}</p>
              {trackBpm && (
                <div className="mt-3 flex items-center justify-center">
                  <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono px-3 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    {trackBpm} BPM
                  </span>
                </div>
              )}
            </div>

            {/* YouTube warning — Fix #3 */}
            {isYouTubeTrack && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-4 max-w-xs mx-4">
                <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-300 text-sm font-semibold">YouTube tidak didukung</p>
                  <p className="text-amber-400/70 text-xs mt-1 leading-relaxed">
                    Rhythm game hanya bisa dimainkan dengan track dari Deezer. Cari lagu yang sama lewat tab <span className="text-amber-300">Best Matches</span> di search.
                  </p>
                </div>
              </div>
            )}

            {!isYouTubeTrack && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md px-4">
                  <button
                    onClick={() => startGame('circle')}
                    disabled={!canStartGame}
                    className="rounded-2xl border border-zinc-700/70 bg-zinc-900/70 hover:border-green-500/60 hover:bg-zinc-900 p-4 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <p className="text-zinc-500 text-[11px] uppercase tracking-[0.18em]">Circle Mode</p>
                    <p className="text-white text-base font-semibold mt-1">Klik / Tap Lingkaran</p>
                    <p className="text-zinc-400 text-xs mt-2">Note muncul mengikuti beat lagu.</p>
                  </button>
                  <button
                    onClick={() => startGame('lane')}
                    disabled={!canStartGame}
                    className="rounded-2xl border border-zinc-700/70 bg-zinc-900/70 hover:border-green-500/60 hover:bg-zinc-900 p-4 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <p className="text-zinc-500 text-[11px] uppercase tracking-[0.18em]">Lane Mode</p>
                    <p className="text-white text-base font-semibold mt-1">D · F · J · K</p>
                    <p className="text-zinc-400 text-xs mt-2">Tekan key saat note turun ke hit line.</p>
                  </button>
                </div>
                {!canStartGame && (
                  <p className="text-xs text-amber-400 text-center px-4">
                    Player masih loading. Tunggu lagu siap dulu.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── COUNTDOWN ── */}
        {gameState === 'countdown' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div key={countdown} style={{ animation: 'countdownPop 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <p className="font-black text-white text-center" style={{ fontSize: countdown === 0 ? '48px' : '120px', lineHeight: 1 }}>
                {countdown === 0 ? 'GO!' : countdown}
              </p>
            </div>
            <p className="text-zinc-600 text-xs font-mono tracking-widest uppercase">
              {trackBpm ? `${gameBpm} BPM • ` : ''}{selectedMode === 'lane' ? 'LANE' : 'CIRCLE'} MODE
            </p>
          </div>
        )}

        {/* ── PLAYING ── */}
        {gameState === 'playing' && (
          <>
            {selectedMode === 'circle' && (
              <div className="absolute inset-0">
                {circleNotes.filter(n => !n.hit).map(n => {
                  const el3 = performance.now() - gameStartTimeRef.current
                  const age = el3 - n.spawnTime
                  const lifeRatio = Math.min(age / n.hitWindow, 1)
                  const opacity = n.missed ? Math.max(0, 1 - (age - n.hitWindow) / 400) : 1
                  const scale = n.missed ? 0.5 : 1
                  return (
                    <button
                      key={n.id}
                      onClick={e => !n.missed && handleCircleClick(n, e)}
                      className="absolute rounded-full flex items-center justify-center"
                      style={{
                        left: n.x - 22, top: n.y - 22, width: 44, height: 44,
                        opacity, transform: `scale(${scale})`,
                        transition: n.missed ? 'all 0.4s ease' : 'none',
                        cursor: n.missed ? 'default' : 'pointer',
                      }}
                    >
                      <div className="absolute inset-0 rounded-full border-2 border-green-400"
                        style={{ transform: `scale(${1.8 - lifeRatio * 0.8})`, opacity: Math.max(0, 1 - lifeRatio) }} />
                      <div className="absolute inset-0 rounded-full"
                        style={{
                          background: n.missed ? 'rgba(239,68,68,0.3)' : `rgba(34,197,94,${0.15 + lifeRatio * 0.25})`,
                          border: `2px solid ${n.missed ? '#ef4444' : '#22c55e'}`,
                          boxShadow: n.missed ? 'none' : `0 0 ${8 + lifeRatio * 12}px rgba(34,197,94,0.4)`,
                        }} />
                      <svg className="absolute inset-0" width="44" height="44" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="22" cy="22" r="19" fill="none" stroke="#22c55e" strokeWidth="2"
                          strokeDasharray={`${119.4 * lifeRatio} 119.4`} opacity="0.6" />
                      </svg>
                    </button>
                  )
                })}
                {hitEffects.map(ef => {
                  const age2 = performance.now() - gameStartTimeRef.current - ef.createdAt
                  const p2 = age2 / EFFECT_DURATION
                  return (
                    <div key={ef.id} className="absolute pointer-events-none select-none font-black text-sm uppercase tracking-widest"
                      style={{
                        left: ef.x - 30, top: ef.y - 40 - p2 * 30, opacity: 1 - p2,
                        color: ef.type === 'perfect' ? '#22c55e' : ef.type === 'good' ? '#fbbf24' : '#ef4444',
                        textShadow: '0 0 10px currentColor', width: 80, textAlign: 'center',
                        transform: `scale(${1 + p2 * 0.3})`,
                      }}>
                      {ef.type === 'perfect' ? '✦ Perfect' : ef.type === 'good' ? 'Good' : 'Miss'}
                    </div>
                  )
                })}
              </div>
            )}

            {selectedMode === 'lane' && (
              <div className="absolute inset-0">
                <div className="absolute left-0 right-0"
                  style={{
                    bottom: '56px', height: '2px',
                    background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.4), rgba(34,197,94,0.8), rgba(34,197,94,0.4), transparent)',
                    zIndex: 2,
                  }} />
                <div className="absolute inset-0 flex">
                  {[0, 1, 2, 3].map(laneIdx => {
                    const laneEff = laneEffects.find(e => e.lane === laneIdx)
                    const isPressed = pressedLanes[laneIdx]
                    return (
                      <div key={laneIdx} className="flex-1 relative overflow-hidden"
                        style={{ borderLeft: laneIdx === 0 ? 'none' : '1px solid rgba(63,63,70,0.3)' }}>
                        {isPressed && (
                          <div className="absolute inset-0"
                            style={{ background: 'linear-gradient(to top, rgba(34,197,94,0.08), transparent)' }} />
                        )}
                        {laneNotes.filter(n => n.lane === laneIdx).map(n => {
                          const areaH = gameAreaRef.current?.clientHeight ?? 600
                          const hitLineY = areaH - 56
                          const noteTop = n.y * hitLineY - 10
                          const opacity = n.hit ? Math.max(0, 1 - (n.y - 0.9) * 10) : n.missed ? 0.25 : 1
                          return (
                            <div key={n.id} className="absolute left-1 right-1 rounded-sm"
                              style={{
                                top: noteTop, height: '20px', opacity,
                                background: n.missed ? '#ef4444' : n.hit ? '#22c55e'
                                  : `linear-gradient(to bottom, rgba(34,197,94,0.9), rgba(34,197,94,0.6))`,
                                boxShadow: n.hit || n.missed ? 'none' : '0 0 8px rgba(34,197,94,0.5)',
                                border: `1px solid ${n.missed ? '#ef4444' : n.hit ? '#4ade80' : 'rgba(74,222,128,0.8)'}`,
                              }} />
                          )
                        })}
                        {laneEff && (() => {
                          const el4 = performance.now() - gameStartTimeRef.current
                          const age4 = el4 - laneEff.createdAt
                          const p4 = age4 / EFFECT_DURATION
                          return (
                            <div className="absolute left-0 right-0 text-center font-black text-xs uppercase tracking-wider pointer-events-none"
                              style={{
                                bottom: 70 + p4 * 20, opacity: 1 - p4,
                                color: laneEff.type === 'perfect' ? '#22c55e' : laneEff.type === 'good' ? '#fbbf24' : '#ef4444',
                                textShadow: '0 0 8px currentColor',
                              }}>
                              {laneEff.type === 'perfect' ? '✦' : laneEff.type === 'good' ? '◆' : '✕'}
                            </div>
                          )
                        })()}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-9 h-9 rounded flex items-center justify-center font-bold text-sm transition-all duration-75"
                          style={{
                            background: isPressed ? 'rgba(34,197,94,0.3)' : 'rgba(39,39,42,0.8)',
                            border: isPressed ? '1px solid rgba(34,197,94,0.8)' : '1px solid rgba(63,63,70,0.6)',
                            color: isPressed ? '#22c55e' : '#71717a',
                            boxShadow: isPressed ? '0 0 12px rgba(34,197,94,0.3)' : 'none',
                            transform: isPressed ? 'scale(0.9)' : 'scale(1)',
                            zIndex: 3,
                          }}>
                          {LANE_LABELS[laneIdx]}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── RESULT ── */}
        {gameState === 'result' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8">
            <div className="text-center space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Result</p>
              <div className="text-8xl font-black"
                style={{ color: rating.color, textShadow: `0 0 40px ${rating.color}60` }}>
                {rating.label}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              {[
                { label: 'Score', value: score.toLocaleString() },
                { label: 'Accuracy', value: `${accuracy}%` },
                { label: 'Max Combo', value: `${maxCombo}×` },
                { label: 'Perfect', value: `${perfectHits}` },
                { label: 'Miss', value: `${missNotes}` },
                { label: 'Hit', value: `${hitNotes}` },
                { label: 'Total', value: `${totalNotes}` },
                { label: 'BPM', value: trackBpm ? `${gameBpm}` : '—' },
                { label: 'Mode', value: selectedMode === 'lane' ? 'LANE' : 'CIRCLE' },
              ].map(s => (
                <div key={s.label} className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest">{s.label}</p>
                  <p className="text-white font-bold text-lg tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => startGame(selectedMode ?? 'circle')}
                disabled={!canStartGame}
                className="px-8 py-2.5 rounded-full bg-green-500 hover:bg-green-400 text-black font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                Play Again
              </button>
              <button
                onClick={() => { stopGame(); onClose() }}
                className="px-8 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes countdownPop {
          0% { transform: scale(1.6); opacity: 0; }
          40% { opacity: 1; }
          80% { transform: scale(1); }
          100% { transform: scale(0.9); opacity: 0; }
        }
        @keyframes comboIn {
          0% { transform: scale(0.7); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}