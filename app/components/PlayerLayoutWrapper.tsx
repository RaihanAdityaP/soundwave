'use client'

import { usePlayerStore } from '@/store/playerStore'
import LyricsPanel from './LyricsPanel'

export function PlayerLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { showLyrics } = usePlayerStore()

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar injected by layout */}
        {/* Main content + optional lyrics panel */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
          {showLyrics && (
            <div className="w-80 bg-zinc-900 border-l border-zinc-800 overflow-hidden">
              <LyricsPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}