import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import PlayerBar from '@/components/PlayerBar'
import { PlayerLayoutWrapper } from '@/components/PlayerLayoutWrapper'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SoundWave',
  description: 'Your music, your way',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} bg-zinc-950 text-white antialiased`}>
        <PlayerLayoutWrapper>
          <div className="flex h-screen flex-col">
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto bg-linear-to-b from-zinc-800 to-zinc-950 p-8">
                {children}
              </main>
            </div>
            <PlayerBar />
          </div>
        </PlayerLayoutWrapper>
      </body>
    </html>
  )
}