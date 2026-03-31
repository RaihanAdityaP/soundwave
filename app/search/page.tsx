import { Suspense } from 'react'
import SearchClient from './SearchClient'

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400 text-sm">Loading...</div>}>
      <SearchClient />
    </Suspense>
  )
}