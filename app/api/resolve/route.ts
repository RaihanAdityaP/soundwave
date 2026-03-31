import { NextRequest, NextResponse } from 'next/server'
import { resolveYouTubeId } from '@/lib/youtube'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ id: null })

  const id = await resolveYouTubeId(q)
  return NextResponse.json({ id })
}