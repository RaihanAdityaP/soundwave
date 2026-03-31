import { NextRequest, NextResponse } from 'next/server'
import { searchYouTube } from '@/lib/youtube'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json([])

  const results = await searchYouTube(q)
  return NextResponse.json(results)
}