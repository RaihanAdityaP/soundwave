'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronDown, Music2 } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'

// ── Types ────────────────────────────────────────────────────────────────────

type CircleNote = {
  id: number
  x: number
  y: number
  spawnTime: number
  hitWindow: number // ms after spawnTime when it should be hit
  hit: boolean
  missed: boolean
}

type LaneNote = {
  id: number
  lane: 0 | 1 | 2 | 3
  y: number // 0 = top, 1 = bottom (hit zone)
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

type GameState = 'idle' | 'countdown' | 'playing' | 'paused' | 'result'

const LANE_KEYS = ['d', 'f', 'j', 'k']
const LANE_LABELS = ['D', 'F', 'J', 'K']
const CIRCLE_HIT_WINDOW = 400 // ms
const LANE_TRAVEL_TIME = 1200 // ms for note to travel from top to hit zone
const PERFECT_THRESHOLD = 80
const GOOD_THRESHOLD = 200
const EFFECT_DURATION = 600
const GAME_DURATION = 60 // seconds

function getRating(accuracy: number) {
  if (accuracy >= 95) return { label: 'S', color: '#22c55e' }
  if (accuracy >= 85) return { label: 'A', color: '#86efac' }
  if (accuracy >= 70) return { label: 'B', color: '#fbbf24' }
  if (accuracy >= 50) return { label: 'C', color: '#f97316' }
  return { label: 'D', color: '#ef4444' }
}

// ── Beat generator ────────────────────────────────────────────────────────────

function generateBeats(durationSec: number, bpm = 128): number[] {
  const beats: number[] = []
  const interval = 60000 / bpm
  // every beat + every half-beat occasionally
  for (let t = 1000; t < durationSec * 1000; t += interval) {
    beats.push(t)
    if (Math.random() > 0.4) beats.push(t + interval / 2)
  }
  return beats.sort((a, b) => a - b)
}

export default function RhythmGame({ onClose }: { onClose: () => void }) {
  const { currentTrack, isPlaying, progress, seekTo } = usePlayerStore()

  // ── Game state ──────────────────────────────────────────────────────────
  const [gameState, setGameState] = useState<GameState>('idle')
  const [countdown, setCountdown] = useState(3)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [totalNotes, setTotalNotes] = useState(0)
  const [hitNotes, setHitNotes] = useState(0)
  const [perfectHits, setPerfectHits] = useState(0)
  const [mounted, setMounted] = useState(false)

  // ── Notes ───────────────────────────────────────────────────────────────
  const [circleNotes, setCircleNotes] = useState<CircleNote[]>([])
  const [laneNotes, setLaneNotes] = useState<LaneNote[]>([])
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([])
  const [laneEffects, setLaneEffects] = useState<LaneEffect[]>([])
  const [pressedLanes, setPressedLanes] = useState<boolean[]>([false, false, false, false])

  // ── Refs ────────────────────────────────────────────────────────────────
  const gameStartTimeRef = useRef<number>(0)
  const beatsRef = useRef<number[]>([])
  const nextBeatIdxRef = useRef(0)
  const noteIdRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const comboRef = useRef(0)
  const scoreRef = useRef(0)
  const hitNotesRef = useRef(0)
  const perfectHitsRef = useRef(0)
  const totalNotesRef = useRef(0)

  // ── Mount animation ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30)
    return () => clearTimeout(t)
  }, [])

  // ── Keyboard close ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopGame()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Start countdown ─────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    setGameState('countdown')
    setCountdown(3)
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setTotalNotes(0)
    setHitNotes(0)
    setPerfectHits(0)
    setCircleNotes([])
    setLaneNotes([])
    setHitEffects([])
    setLaneEffects([])
    comboRef.current = 0
    scoreRef.current = 0
    hitNotesRef.current = 0
    perfectHitsRef.current = 0
    totalNotesRef.current = 0
    noteIdRef.current = 0
    nextBeatIdxRef.current = 0

    let c = 3
    const interval = setInterval(() => {
      c--
      setCountdown(c)
      if (c <= 0) {
        clearInterval(interval)
        beginPlaying()
      }
    }, 1000)
  }, [])

  const beginPlaying = useCallback(() => {
    beatsRef.current = generateBeats(GAME_DURATION)
    gameStartTimeRef.current = performance.now()
    setGameState('playing')
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [])

  const stopGame = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  // ── Main game loop ──────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const now = performance.now()
    const elapsed = now - gameStartTimeRef.current

    if (elapsed >= GAME_DURATION * 1000) {
      setGameState('result')
      return
    }

    // Spawn notes from beats
    while (
      nextBeatIdxRef.current < beatsRef.current.length &&
      beatsRef.current[nextBeatIdxRef.current] <= elapsed + LANE_TRAVEL_TIME
    ) {
      const beatTime = beatsRef.current[nextBeatIdxRef.current]
      const id = noteIdRef.current++
      const isLane = Math.random() > 0.45
      totalNotesRef.current++

      if (isLane) {
        const lane = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3
        setLaneNotes(prev => [...prev, {
          id, lane,
          y: 0,
          spawnTime: beatTime,
          hit: false,
          missed: false,
        }])
      } else {
        const area = gameAreaRef.current
        const w = area?.clientWidth ?? 600
        const h = area?.clientHeight ?? 400
        setCircleNotes(prev => [...prev, {
          id,
          x: 48 + Math.random() * Math.max(0, w - 96),
          y: 48 + Math.random() * Math.max(0, (h - 200) - 96),
          spawnTime: beatTime,
          hitWindow: CIRCLE_HIT_WINDOW,
          hit: false,
          missed: false,
        }])
      }
      nextBeatIdxRef.current++
    }

    // Update note positions & check misses
    setCircleNotes(prev => prev.map(n => {
      if (n.hit) return n
      const age = elapsed - n.spawnTime
      if (age > n.hitWindow + PERFECT_THRESHOLD) return { ...n, missed: true }
      return n
    }).filter(n => !n.missed || elapsed - n.spawnTime < n.hitWindow + 800))

    setLaneNotes(prev => prev.map(n => {
      if (n.hit || n.missed) return n
      const age = elapsed - n.spawnTime
      const progress = Math.min(age / LANE_TRAVEL_TIME, 1)
      if (age > LANE_TRAVEL_TIME + GOOD_THRESHOLD) {
        // missed
        comboRef.current = 0
        setCombo(0)
        totalNotesRef.current = totalNotesRef.current // already counted
        return { ...n, missed: true, y: 1 }
      }
      return { ...n, y: progress }
    }).filter(n => {
      if (n.missed) {
        const age = elapsed - n.spawnTime
        return age < LANE_TRAVEL_TIME + 800
      }
      return true
    }))

    // Cleanup old effects
    setHitEffects(prev => prev.filter(e => elapsed - e.createdAt < EFFECT_DURATION))
    setLaneEffects(prev => prev.filter(e => elapsed - e.createdAt < EFFECT_DURATION))

    rafRef.current = requestAnimationFrame(gameLoop)
  }, [])

  // ── Circle hit ──────────────────────────────────────────────────────────
  const handleCircleClick = useCallback((note: CircleNote, e: React.MouseEvent) => {
    e.stopPropagation()
    const elapsed = performance.now() - gameStartTimeRef.current
    const age = elapsed - note.spawnTime
    const diff = Math.abs(age - note.hitWindow / 2)

    let type: 'perfect' | 'good' | 'miss' = 'miss'
    let pts = 0
    if (diff < PERFECT_THRESHOLD) { type = 'perfect'; pts = 300 }
    else if (diff < GOOD_THRESHOLD) { type = 'good'; pts = 100 }
    else { type = 'miss'; pts = 0 }

    if (type !== 'miss') {
      comboRef.current++
      setCombo(comboRef.current)
      setMaxCombo(prev => Math.max(prev, comboRef.current))
      hitNotesRef.current++
      setHitNotes(hitNotesRef.current)
      if (type === 'perfect') {
        perfectHitsRef.current++
        setPerfectHits(perfectHitsRef.current)
      }
    } else {
      comboRef.current = 0
      setCombo(0)
    }

    const bonus = Math.floor(pts * (1 + comboRef.current * 0.1))
    scoreRef.current += bonus
    setScore(scoreRef.current)

    setCircleNotes(prev => prev.map(n => n.id === note.id ? { ...n, hit: true } : n))
    setHitEffects(prev => [...prev, {
      id: Date.now(),
      x: note.x, y: note.y,
      type,
      createdAt: elapsed,
    }])
  }, [])

  // ── Lane key press ──────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'playing') return

    const handleKeyDown = (e: KeyboardEvent) => {
      const laneIdx = LANE_KEYS.indexOf(e.key.toLowerCase())
      if (laneIdx === -1) return
      e.preventDefault()

      setPressedLanes(prev => {
        const next = [...prev]
        next[laneIdx] = true
        return next
      })

      const elapsed = performance.now() - gameStartTimeRef.current

      setLaneNotes(prev => {
        // Find closest note in this lane near hit zone
        const candidates = prev.filter(n =>
          !n.hit && !n.missed && n.lane === laneIdx &&
          n.y > 0.6
        )
        if (candidates.length === 0) {
          // miss press
          setLaneEffects(e2 => [...e2, {
            id: Date.now(), lane: laneIdx as 0|1|2|3,
            type: 'miss', createdAt: elapsed,
          }])
          comboRef.current = 0
          setCombo(0)
          return prev
        }

        // closest to y=1
        const target = candidates.reduce((a, b) => Math.abs(a.y - 1) < Math.abs(b.y - 1) ? a : b)
        const diff = Math.abs(target.y - 1)

        let type: 'perfect' | 'good' | 'miss' = 'miss'
        let pts = 0
        if (diff < 0.08) { type = 'perfect'; pts = 300 }
        else if (diff < 0.18) { type = 'good'; pts = 100 }
        else { type = 'miss'; pts = 0 }

        if (type !== 'miss') {
          comboRef.current++
          setCombo(comboRef.current)
          setMaxCombo(p => Math.max(p, comboRef.current))
          hitNotesRef.current++
          setHitNotes(hitNotesRef.current)
          if (type === 'perfect') {
            perfectHitsRef.current++
            setPerfectHits(p => p + 1)
          }
        } else {
          comboRef.current = 0
          setCombo(0)
        }

        const bonus = Math.floor(pts * (1 + comboRef.current * 0.1))
        scoreRef.current += bonus
        setScore(scoreRef.current)

        setLaneEffects(e2 => [...e2, {
          id: Date.now(), lane: laneIdx as 0|1|2|3,
          type, createdAt: elapsed,
        }])

        return prev.map(n => n.id === target.id ? { ...n, hit: true } : n)
      })
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const laneIdx = LANE_KEYS.indexOf(e.key.toLowerCase())
      if (laneIdx === -1) return
      setPressedLanes(prev => {
        const next = [...prev]
        next[laneIdx] = false
        return next
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameState])

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  // ── Derived ─────────────────────────────────────────────────────────────
  const accuracy = totalNotes > 0 ? Math.round((hitNotes / totalNotes) * 100) : 100
  const elapsed = gameState === 'playing' ? performance.now() - gameStartTimeRef.current : 0
  const timeLeft = Math.max(0, GAME_DURATION - Math.floor(elapsed / 1000))
  const rating = getRating(accuracy)

  if (!currentTrack) return null

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className={`fixed inset-0 z-60 flex flex-col transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: '#09090b' }}
    >
      {/* Blurred album art bg */}
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

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34,197,94,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,197,94,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Header ── */}
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
        </div>

        <button
          onClick={() => { stopGame(); onClose() }}
          className="p-2 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Stats bar ── */}
      <div className="relative z-10 flex items-center justify-between px-8 py-2 shrink-0">
        {/* Score */}
        <div className="w-32">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Score</p>
          <p className="text-2xl font-bold text-white tabular-nums leading-tight">
            {score.toLocaleString()}
          </p>
        </div>

        {/* Combo — center */}
        <div className="text-center">
          {combo > 1 && (
            <div
              key={combo}
              className="animate-[comboPop_0.2s_ease-out]"
              style={{ animation: 'comboIn 0.15s cubic-bezier(0.34,1.56,0.64,1)' }}
            >
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

        {/* Timer + accuracy */}
        <div className="w-32 text-right">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">
            {gameState === 'playing' ? `${timeLeft}s` : 'Accuracy'}
          </p>
          <p className="text-2xl font-bold tabular-nums leading-tight" style={{ color: '#22c55e' }}>
            {accuracy}%
          </p>
        </div>
      </div>

      {/* ── Progress bar ── */}
      {gameState === 'playing' && (
        <div className="relative z-10 px-8 shrink-0">
          <div className="h-0.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-1000"
              style={{ width: `${((GAME_DURATION - timeLeft) / GAME_DURATION) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Game area ── */}
      <div ref={gameAreaRef} className="relative z-10 flex-1 overflow-hidden">

        {/* ── IDLE STATE ── */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-8">
            {/* Album art */}
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <Image src={currentTrack.thumbnail} alt="" fill className="object-cover" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">{currentTrack.title}</p>
              <p className="text-zinc-400 text-sm">{currentTrack.artist}</p>
            </div>

            {/* Controls legend */}
            <div className="flex gap-6 text-center">
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Circle notes</p>
                <p className="text-zinc-300 text-sm">Click / Tap</p>
              </div>
              <div className="w-px bg-zinc-800" />
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Lane notes</p>
                <div className="flex gap-1.5 justify-center">
                  {LANE_LABELS.map(k => (
                    <span key={k} className="w-7 h-7 bg-zinc-800 border border-zinc-700 rounded text-xs font-bold text-zinc-300 flex items-center justify-center">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={startGame}
              className="mt-2 px-10 py-3 rounded-full bg-green-500 hover:bg-green-400 text-black font-bold text-base transition-all hover:scale-105 active:scale-95 shadow-lg shadow-green-500/20"
            >
              Play
            </button>
          </div>
        )}

        {/* ── COUNTDOWN ── */}
        {gameState === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              key={countdown}
              className="text-center"
              style={{ animation: 'countdownPop 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
            >
              <p
                className="font-black text-white"
                style={{ fontSize: countdown === 0 ? '48px' : '120px', lineHeight: 1 }}
              >
                {countdown === 0 ? 'GO!' : countdown}
              </p>
            </div>
          </div>
        )}

        {/* ── PLAYING ── */}
        {gameState === 'playing' && (
          <>
            {/* Circle notes zone (upper 70%) */}
            <div className="absolute inset-0" style={{ bottom: '200px' }}>
              {circleNotes.filter(n => !n.hit).map(n => {
                const elapsed2 = performance.now() - gameStartTimeRef.current
                const age = elapsed2 - n.spawnTime
                const lifeRatio = Math.min(age / n.hitWindow, 1)
                const opacity = n.missed ? Math.max(0, 1 - (age - n.hitWindow) / 400) : 1
                const scale = n.missed ? 0.5 : 1

                return (
                  <button
                    key={n.id}
                    onClick={(e) => !n.missed && handleCircleClick(n, e)}
                    className="absolute rounded-full flex items-center justify-center"
                    style={{
                      left: n.x - 22,
                      top: n.y - 22,
                      width: 44,
                      height: 44,
                      opacity,
                      transform: `scale(${scale})`,
                      transition: n.missed ? 'all 0.4s ease' : 'none',
                      cursor: n.missed ? 'default' : 'pointer',
                    }}
                  >
                    {/* Shrinking approach ring */}
                    <div
                      className="absolute inset-0 rounded-full border-2 border-green-400"
                      style={{
                        transform: `scale(${1.8 - lifeRatio * 0.8})`,
                        opacity: Math.max(0, 1 - lifeRatio),
                        transition: 'none',
                      }}
                    />
                    {/* Core circle */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: n.missed
                          ? 'rgba(239,68,68,0.3)'
                          : `rgba(34,197,94,${0.15 + lifeRatio * 0.25})`,
                        border: `2px solid ${n.missed ? '#ef4444' : '#22c55e'}`,
                        boxShadow: n.missed ? 'none' : `0 0 ${8 + lifeRatio * 12}px rgba(34,197,94,0.4)`,
                      }}
                    />
                    {/* Approach progress ring */}
                    <svg className="absolute inset-0" width="44" height="44" style={{ transform: 'rotate(-90deg)' }}>
                      <circle
                        cx="22" cy="22" r="19"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2"
                        strokeDasharray={`${119.4 * lifeRatio} 119.4`}
                        opacity="0.6"
                      />
                    </svg>
                  </button>
                )
              })}

              {/* Hit effects */}
              {hitEffects.map(e => {
                const age2 = performance.now() - gameStartTimeRef.current - e.createdAt
                const progress2 = age2 / EFFECT_DURATION
                return (
                  <div
                    key={e.id}
                    className="absolute pointer-events-none select-none font-black text-sm uppercase tracking-widest"
                    style={{
                      left: e.x - 30,
                      top: e.y - 40 - progress2 * 30,
                      opacity: 1 - progress2,
                      color: e.type === 'perfect' ? '#22c55e' : e.type === 'good' ? '#fbbf24' : '#ef4444',
                      textShadow: `0 0 10px currentColor`,
                      width: 80,
                      textAlign: 'center',
                      transform: `scale(${1 + progress2 * 0.3})`,
                    }}
                  >
                    {e.type === 'perfect' ? '✦ Perfect' : e.type === 'good' ? 'Good' : 'Miss'}
                  </div>
                )
              })}
            </div>

            {/* Lane notes zone (lower section) */}
            <div
              className="absolute left-0 right-0"
              style={{ bottom: 0, height: '200px' }}
            >
              {/* Hit line */}
              <div
                className="absolute left-0 right-0"
                style={{
                  bottom: '48px',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.4), rgba(34,197,94,0.8), rgba(34,197,94,0.4), transparent)',
                }}
              />

              {/* Lanes */}
              <div className="absolute inset-0 flex">
                {[0, 1, 2, 3].map(laneIdx => {
                  const laneEffect = laneEffects.find(e => e.lane === laneIdx)
                  const isPressed = pressedLanes[laneIdx]
                  return (
                    <div
                      key={laneIdx}
                      className="flex-1 relative"
                      style={{
                        borderLeft: laneIdx === 0 ? 'none' : '1px solid rgba(63,63,70,0.3)',
                      }}
                    >
                      {/* Lane glow on press */}
                      {isPressed && (
                        <div
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(to top, rgba(34,197,94,0.12), transparent)',
                          }}
                        />
                      )}

                      {/* Notes in this lane */}
                      {laneNotes
                        .filter(n => n.lane === laneIdx)
                        .map(n => {
                          const noteBottom = (1 - n.y) * 152 + 48
                          const opacity = n.hit
                            ? Math.max(0, 1 - (n.y - 0.9) * 5)
                            : n.missed
                            ? 0.3
                            : 1
                          return (
                            <div
                              key={n.id}
                              className="absolute left-1 right-1 rounded-sm"
                              style={{
                                bottom: noteBottom,
                                height: '20px',
                                opacity,
                                background: n.missed
                                  ? '#ef4444'
                                  : n.hit
                                  ? '#22c55e'
                                  : `linear-gradient(to bottom, rgba(34,197,94,0.9), rgba(34,197,94,0.6))`,
                                boxShadow: n.hit || n.missed ? 'none' : '0 0 8px rgba(34,197,94,0.5)',
                                border: `1px solid ${n.missed ? '#ef4444' : n.hit ? '#4ade80' : 'rgba(74,222,128,0.8)'}`,
                              }}
                            />
                          )
                        })}

                      {/* Lane effect label */}
                      {laneEffect && (() => {
                        const elapsed3 = performance.now() - gameStartTimeRef.current
                        const age3 = elapsed3 - laneEffect.createdAt
                        const p3 = age3 / EFFECT_DURATION
                        return (
                          <div
                            className="absolute left-0 right-0 text-center font-black text-xs uppercase tracking-wider pointer-events-none"
                            style={{
                              bottom: 60 + p3 * 20,
                              opacity: 1 - p3,
                              color: laneEffect.type === 'perfect' ? '#22c55e' : laneEffect.type === 'good' ? '#fbbf24' : '#ef4444',
                              textShadow: '0 0 8px currentColor',
                            }}
                          >
                            {laneEffect.type === 'perfect' ? '✦' : laneEffect.type === 'good' ? '◆' : '✕'}
                          </div>
                        )
                      })()}

                      {/* Key button */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 bottom-1 w-9 h-9 rounded flex items-center justify-center font-bold text-sm transition-all duration-75"
                        style={{
                          background: isPressed
                            ? 'rgba(34,197,94,0.3)'
                            : 'rgba(39,39,42,0.8)',
                          border: isPressed
                            ? '1px solid rgba(34,197,94,0.8)'
                            : '1px solid rgba(63,63,70,0.6)',
                          color: isPressed ? '#22c55e' : '#71717a',
                          boxShadow: isPressed ? '0 0 12px rgba(34,197,94,0.3)' : 'none',
                          transform: isPressed ? 'scale(0.9)' : 'scale(1)',
                        }}
                      >
                        {LANE_LABELS[laneIdx]}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ── RESULT ── */}
        {gameState === 'result' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8">
            <div className="text-center space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Result</p>
              <div
                className="text-8xl font-black"
                style={{ color: rating.color, textShadow: `0 0 40px ${rating.color}60` }}
              >
                {rating.label}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              {[
                { label: 'Score', value: score.toLocaleString() },
                { label: 'Accuracy', value: `${accuracy}%` },
                { label: 'Max Combo', value: `${maxCombo}×` },
                { label: 'Perfect', value: `${perfectHits}` },
                { label: 'Hit', value: `${hitNotes}` },
                { label: 'Total', value: `${totalNotes}` },
              ].map(s => (
                <div key={s.label} className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest">{s.label}</p>
                  <p className="text-white font-bold text-lg tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="px-8 py-2.5 rounded-full bg-green-500 hover:bg-green-400 text-black font-bold text-sm transition-all hover:scale-105 active:scale-95"
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

      {/* ── CSS animations (injected) ── */}
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