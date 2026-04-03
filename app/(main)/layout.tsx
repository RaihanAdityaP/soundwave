import Sidebar from '@/components/Sidebar'
import PlayerBar from '@/components/PlayerBar'
import { PlayerLayoutWrapper } from '@/components/PlayerLayoutWrapper'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlayerLayoutWrapper>
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-linear-to-b from-zinc-800 to-zinc-950 p-4 md:p-8 pb-36 md:pb-8">
            {children}
          </main>
        </div>
        <PlayerBar />
      </div>
    </PlayerLayoutWrapper>
  )
}