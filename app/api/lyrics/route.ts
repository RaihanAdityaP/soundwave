import { NextRequest, NextResponse } from 'next/server'
import { fetchLyrics } from '@/lib/lyrics'

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title') || ''
  const artist = req.nextUrl.searchParams.get('artist') || ''

  const lyrics = await fetchLyrics(title, artist)
  return NextResponse.json(lyrics)
}