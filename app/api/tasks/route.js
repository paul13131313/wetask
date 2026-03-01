import { NextResponse } from 'next/server'
import { kvGet, kvSet } from '@/lib/redis'
import { INITIAL_MEMBERS, INITIAL_TASKS } from '@/lib/initialData'

const TASKS_KEY = 'wetask:tasks'
const MEMBERS_KEY = 'wetask:members'

export async function GET() {
  try {
    const [tasks, members] = await Promise.all([
      kvGet(TASKS_KEY),
      kvGet(MEMBERS_KEY),
    ])
    return NextResponse.json({
      tasks: tasks || INITIAL_TASKS,
      members: members || INITIAL_MEMBERS,
    })
  } catch (err) {
    console.error('GET /api/tasks error:', err)
    return NextResponse.json({
      tasks: INITIAL_TASKS,
      members: INITIAL_MEMBERS,
    }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const { tasks, members } = await request.json()

    // 入力バリデーション
    if (!Array.isArray(tasks) || !Array.isArray(members)) {
      return NextResponse.json({ ok: false, error: 'tasks・membersは配列で指定してください' }, { status: 400 })
    }

    await Promise.all([
      kvSet(TASKS_KEY, tasks),
      kvSet(MEMBERS_KEY, members),
    ])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/tasks error:', err)
    return NextResponse.json({ ok: false, error: 'サーバーエラー' }, { status: 500 })
  }
}
