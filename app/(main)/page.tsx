import Link from 'next/link'
import { Search } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="space-y-8 md:space-y-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Welcome 👋</h1>
        <p className="text-zinc-400 mt-1 text-sm md:text-base">What do you want to listen to today?</p>
      </div>

      <Link
        href="/search"
        className="flex items-center gap-3 w-full max-w-md bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-full px-5 py-3 text-zinc-400"
      >
        <Search size={18} />
        <span className="text-sm">Search songs, artists...</span>
      </Link>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {['Pop', 'Hip-Hop', 'Electronic', 'Rock', 'R&B', 'Jazz'].map((genre) => (
          <Link
            key={genre}
            href={`/search?q=${encodeURIComponent(genre)}`}
            className="bg-linear-to-br from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 rounded-lg p-4 md:p-6 font-bold text-white text-base md:text-lg transition-all hover:scale-105 active:scale-95"
          >
            {genre}
          </Link>
        ))}
      </div>
    </div>
  )
}