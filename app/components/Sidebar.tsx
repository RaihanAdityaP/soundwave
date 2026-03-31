'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Heart, Music2, User } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/liked', label: 'Liked Songs', icon: Heart },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-black flex flex-col p-6 gap-8 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 text-white font-bold text-xl">
        <Music2 className="text-green-500" size={28} />
        SoundWave
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-4 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              pathname === href
                ? 'text-white bg-zinc-800'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Profile link at bottom */}
      <Link
        href="/profile"
        className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
          pathname === '/profile'
            ? 'text-white bg-zinc-800'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        <div className="w-7 h-7 rounded-full bg-linear-to-br from-green-500 to-emerald-700 flex items-center justify-center shrink-0">
          <User size={13} className="text-black" />
        </div>
        Profile
      </Link>
    </aside>
  )
}