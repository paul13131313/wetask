import { NextResponse } from 'next/server'
import { kvGet, kvSet } from '@/lib/redis'
import { INITIAL_MEMBERS, INITIAL_TASKS } from '@/lib/initialData'

const TASKS_KEY = 'wetask:tasks'
const MEMBERS_KEY = 'wetask:members'

export async function GET() {
  const [tasks, members] = await Promise.all([
    kvGet(TASKS_KEY),
    kvGet(MEMBERS_KEY),
  ])
  return NextResponse.json({
    tasks: tasks || INITIAL_TASKS,
    members: members || INITIAL_MEMBERS,
  })
}

export async function PUT(request) {
  const { tasks, members } = await request.json()
  await Promise.all([
    kvSet(TASKS_KEY, tasks),
    kvSet(MEMBERS_KEY, members),
  ])
  return NextResponse.json({ ok: true })
}
