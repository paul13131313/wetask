import { NextResponse } from 'next/server'
import { kvGet, kvSet } from '@/lib/redis'
import { randomUUID } from 'crypto'

const THANKS_KEY = 'wetask:thanks'

export async function GET() {
  try {
    const thanks = await kvGet(THANKS_KEY)
    return NextResponse.json({ thanks: thanks || [] })
  } catch (err) {
    console.error('GET /api/thanks error:', err)
    return NextResponse.json({ thanks: [] }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const card = await request.json()

    // 入力バリデーション
    if (!card.taskId || !card.taskName || !card.from || !card.to) {
      return NextResponse.json({ ok: false, error: '必須項目が不足しています' }, { status: 400 })
    }
    const message = typeof card.message === 'string' ? card.message.slice(0, 500) : ''

    const thanks = (await kvGet(THANKS_KEY)) || []
    const newCard = {
      id: randomUUID(),
      taskId: card.taskId,
      taskName: String(card.taskName).slice(0, 200),
      from: String(card.from).slice(0, 100),
      to: String(card.to).slice(0, 100),
      message,
      date: new Date().toISOString(),
    }
    thanks.unshift(newCard)
    // 直近100件まで保持
    if (thanks.length > 100) thanks.length = 100
    await kvSet(THANKS_KEY, thanks)
    return NextResponse.json({ ok: true, card: newCard })
  } catch (err) {
    console.error('POST /api/thanks error:', err)
    return NextResponse.json({ ok: false, error: 'サーバーエラー' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ ok: false, error: 'IDが必要です' }, { status: 400 })
    }
    const thanks = (await kvGet(THANKS_KEY)) || []
    const filtered = thanks.filter(c => c.id !== id)
    await kvSet(THANKS_KEY, filtered)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/thanks error:', err)
    return NextResponse.json({ ok: false, error: 'サーバーエラー' }, { status: 500 })
  }
}
