'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Heart, Music2, User, Library } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Library', icon: Library },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-black flex-col p-6 gap-8 shrink-0">
        <div className="flex items-center gap-2 text-white font-bold text-xl">
          <Music2 className="text-green-500" size={28} />
          SoundWave
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-4 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                pathname === href || pathname.startsWith(href + '/')
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>

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

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 border-t border-zinc-800 flex items-center justify-around px-2 pb-safe">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 py-3 px-3 transition-colors ${
              pathname === href || pathname.startsWith(href + '/') ? 'text-green-400' : 'text-zinc-500'
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1 py-3 px-3 transition-colors ${
            pathname === '/profile' ? 'text-green-400' : 'text-zinc-500'
          }`}
        >
          <div className={`w-6 h-6 rounded-full bg-linear-to-br from-green-500 to-emerald-700 flex items-center justify-center ${pathname === '/profile' ? 'ring-2 ring-green-400' : ''}`}>
            <User size={12} className="text-black" />
          </div>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>
    </>
  )
}