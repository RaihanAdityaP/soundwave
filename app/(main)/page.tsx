import Link from 'next/link'
import { Search } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white">Good evening 👋</h1>
        <p className="text-zinc-400 mt-1">What do you want to listen to today?</p>
      </div>

      <Link
        href="/search"
        className="flex items-center gap-3 w-full max-w-md bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-full px-5 py-3 text-zinc-400"
      >
        <Search size={18} />
        Search songs, artists...
      </Link>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {['Pop', 'Hip-Hop', 'Electronic', 'Rock', 'R&B', 'Jazz'].map((genre) => (
          <Link
            key={genre}
            href={`/search?q=${encodeURIComponent(genre)}`}
            className="bg-linear-to-br from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 rounded-lg p-6 font-bold text-white text-lg transition-all hover:scale-105"
          >
            {genre}
          </Link>
        ))}
      </div>
    </div>
  )
}