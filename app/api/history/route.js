import { NextResponse } from 'next/server'
import { kvGet, kvSet } from '@/lib/redis'

const HISTORY_KEY = 'wetask:history'

export async function GET() {
  try {
    const history = await kvGet(HISTORY_KEY)
    return NextResponse.json({ history: history || [] })
  } catch (err) {
    console.error('GET /api/history error:', err)
    return NextResponse.json({ history: [] }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const { history } = await request.json()

    if (!Array.isArray(history)) {
      return NextResponse.json({ ok: false, error: 'historyは配列で指定してください' }, { status: 400 })
    }

    await kvSet(HISTORY_KEY, history)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/history error:', err)
    return NextResponse.json({ ok: false, error: 'サーバーエラー' }, { status: 500 })
  }
}
