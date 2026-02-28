import { NextResponse } from 'next/server'

export async function POST(request) {
  const { type, data } = await request.json()

  const token = process.env.CHATWORK_API_TOKEN
  const roomId = process.env.CHATWORK_ROOM_ID

  if (!token || !roomId) {
    return NextResponse.json({ ok: false, error: 'Chatwork未設定' })
  }

  let body = ''

  if (type === 'task_done') {
    // タスク完了通知
    const proxyLabel = data.isProxy ? '（代行）' : ''
    body = `[info][title]✅ 雑務完了[/title]「${data.taskName}」を ${data.memberName} さんが完了しました${proxyLabel}[/info]`
  } else if (type === 'thanks') {
    // THANKSカード通知
    body = `[info][title]💐 THANKSカード[/title]${data.fromName} → ${data.toName}\n「${data.taskName}」の代行ありがとう！`
    if (data.message) {
      body += `\n💬 ${data.message}`
    }
    body += '[/info]'
  }

  if (!body) {
    return NextResponse.json({ ok: false, error: '不明な通知タイプ' })
  }

  const res = await fetch(`https://api.chatwork.com/v2/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: {
      'X-ChatWorkToken': token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `body=${encodeURIComponent(body)}`,
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('Chatwork API error:', res.status, errorText)
    return NextResponse.json({ ok: false, error: `Chatwork API ${res.status}` })
  }

  return NextResponse.json({ ok: true })
}
