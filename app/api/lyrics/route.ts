import { NextRequest, NextResponse } from 'next/server'
import { fetchLyrics } from '@/lib/lyrics'

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title') || ''
  const artist = req.nextUrl.searchParams.get('artist') || ''
  const durationParam = req.nextUrl.searchParams.get('duration')
  const duration = durationParam ? parseInt(durationParam) : undefined

  const lyrics = await fetchLyrics(title, artist, duration)
  return NextResponse.json(lyrics)
}