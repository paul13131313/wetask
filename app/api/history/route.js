import { NextResponse } from 'next/server'
import { kvGet, kvSet } from '@/lib/redis'

const HISTORY_KEY = 'wetask:history'

export async function GET() {
  const history = await kvGet(HISTORY_KEY)
  return NextResponse.json({ history: history || [] })
}

export async function PUT(request) {
  const { history } = await request.json()
  await kvSet(HISTORY_KEY, history)
  return NextResponse.json({ ok: true })
}
