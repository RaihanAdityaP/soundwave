'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Track } from '@/types'
import TrackCard from '@/components/TrackCard'

export default function SearchClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<{ youtube: Track[]; deezer: Track[] }>({
    youtube: [],
    deezer: [],
  })
  const [loading, setLoading] = useState(false)

  // Track query yang sudah/sedang di-fetch agar tidak double-call
  const lastSearchedRef = useRef<string | null>(null)

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    // Cegah re-fetch kalau query sama persis
    if (lastSearchedRef.current === trimmed) return
    lastSearchedRef.current = trimmed

    setLoading(true)

    try {
      const [yt, dz] = await Promise.all([
        fetch(`/api/youtube?q=${encodeURIComponent(trimmed)}`).then(r => r.json()).catch(() => []),
        fetch(`/api/deezer?q=${encodeURIComponent(trimmed)}`).then(r => r.json()).catch(() => []),
      ])
      setResults({ youtube: Array.isArray(yt) ? yt : [], deezer: Array.isArray(dz) ? dz : [] })
    } catch {
      setResults({ youtube: [], deezer: [] })
    }

    setLoading(false)
  }, [])

  // Hanya trigger dari URL (navigasi awal / back-forward)
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setQuery(q)
      const id = setTimeout(() => { void search(q) }, 0)
      return () => clearTimeout(id)
    }
  }, [searchParams, search])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    // Reset guard supaya URL push tidak blocked saat query beda
    lastSearchedRef.current = null
    // Push URL dulu — useEffect di atas akan trigger search
    router.push(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false })
  }

  const hasResults = results.deezer.length > 0 || results.youtube.length > 0
  const allTracks = [...results.deezer, ...results.youtube]

  return (
    <div className="space-y-6 md:space-y-8">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 bg-zinc-800 rounded-full px-4 md:px-5 py-3 w-full md:max-w-lg">
          <Search size={18} className="text-zinc-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists..."
            className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-sm"
            autoFocus
          />
        </div>
      </form>

      {loading && (
        <p className="text-zinc-400 text-sm animate-pulse">Searching...</p>
      )}

      {!loading && results.deezer.length > 0 && (
        <section>
          <h2 className="text-white font-bold text-base md:text-lg mb-3 flex items-center gap-2">
            <span className="text-purple-400">♫</span> Best Matches
            <span className="text-xs text-zinc-500 font-normal ml-1">via Deezer</span>
          </h2>
          <div className="space-y-1">
            {results.deezer.map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                trackList={allTracks}
                trackIndex={i}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && results.youtube.length > 0 && (
        <section>
          <h2 className="text-white font-bold text-base md:text-lg mb-3 flex items-center gap-2">
            <span className="text-red-400">▶</span> YouTube
          </h2>
          <div className="space-y-1">
            {results.youtube.map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                trackList={allTracks}
                trackIndex={results.deezer.length + i}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && !hasResults && query && (
        <p className="text-zinc-500 text-sm">No results found for &quot;{query}&quot;</p>
      )}
    </div>
  )
}