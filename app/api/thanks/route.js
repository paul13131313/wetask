import { NextResponse } from 'next/server'
import { kvGet, kvSet } from '@/lib/redis'

const THANKS_KEY = 'wetask:thanks'

export async function GET() {
  const thanks = await kvGet(THANKS_KEY)
  return NextResponse.json({ thanks: thanks || [] })
}

export async function POST(request) {
  const card = await request.json()
  const thanks = (await kvGet(THANKS_KEY)) || []
  const newCard = {
    id: Date.now(),
    taskId: card.taskId,
    taskName: card.taskName,
    from: card.from,
    to: card.to,
    message: card.message || '',
    date: new Date().toISOString(),
  }
  thanks.unshift(newCard)
  // 直近100件まで保持
  if (thanks.length > 100) thanks.length = 100
  await kvSet(THANKS_KEY, thanks)
  return NextResponse.json({ ok: true, card: newCard })
}

export async function DELETE(request) {
  const { id } = await request.json()
  const thanks = (await kvGet(THANKS_KEY)) || []
  const filtered = thanks.filter(c => c.id !== id)
  await kvSet(THANKS_KEY, filtered)
  return NextResponse.json({ ok: true })
}
