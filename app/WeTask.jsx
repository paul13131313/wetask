'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { INITIAL_MEMBERS, INITIAL_TASKS } from '@/lib/initialData'

const TYPE_CONFIG = {
  fixed: { label: '固定担当', emoji: '📌', color: '#E84855' },
  rotation: { label: 'ローテーション', emoji: '🔄', color: '#3B82F6' },
  flexible: { label: 'フレキシブル', emoji: '🤝', color: '#10B981' },
}

const FREQ_COLORS = {
  '週1': '#7C3AED',
  '月1': '#D97706',
  '不定期': '#6B7280',
}

const AVATAR_COLORS = ['#E84855', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#0EA5E9', '#D946EF', '#84CC16']

function getInitials(name) {
  if (!name) return '?'
  return name.charAt(0)
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

// サーバーへの保存（デバウンス付き）
function useSaveToServer(members, tasks) {
  const timeoutRef = useRef(null)
  const isInitialLoad = useRef(true)

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, members }),
      }).catch(err => console.error('保存エラー:', err))
    }, 500)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [members, tasks])
}

export default function App() {
  const [members, setMembers] = useState(INITIAL_MEMBERS)
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('board')
  const [filter, setFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [newTask, setNewTask] = useState({ name: '', frequency: '不定期', type: 'fixed' })
  const [newMember, setNewMember] = useState({ name: '', role: '' })

  // サーバーからデータ読み込み
  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        setMembers(data.members)
        setTasks(data.tasks)
        setLoading(false)
      })
      .catch(err => {
        console.error('読み込みエラー:', err)
        setLoading(false)
      })
  }, [])

  // 変更時にサーバーへ自動保存（500msデバウンス）
  useSaveToServer(members, tasks)

  const [dragState, setDragState] = useState({ draggingId: null, overId: null, dragType: null })
  const [memberDragOver, setMemberDragOver] = useState(null)
  const [doneSelectingId, setDoneSelectingId] = useState(null)

  // Helper functions using members state
  function getMemberName(id) {
    if (!id) return null
    const m = members.find(m => m.id === id)
    return m ? m.name : null
  }

  function getShortName(id) {
    const name = getMemberName(id)
    if (!name) return '?'
    return name.length > 3 ? name.substring(0, 3) : name
  }

  function getAvatarColor(id) {
    if (!id) return '#D1D5DB'
    const idx = members.findIndex(m => m.id === id)
    if (idx === -1) return '#D1D5DB'
    return AVATAR_COLORS[idx % AVATAR_COLORS.length]
  }

  function addMember() {
    if (!newMember.name.trim()) return
    const id = newMember.name.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now()
    setMembers(prev => [...prev, { id, name: newMember.name.trim(), role: newMember.role.trim() || 'メンバー' }])
    setNewMember({ name: '', role: '' })
    setShowAddMemberModal(false)
  }

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true
    if (filter === 'flexible') return t.type === 'flexible'
    if (filter === 'unassigned') return t.assignees.length === 0
    return t.assignees.includes(filter)
  })

  const memberCounts = members.map(m => ({
    ...m,
    count: tasks.filter(t => t.assignees.includes(m.id)).length
  }))

  const unassignedCount = tasks.filter(t => t.assignees.length === 0).length

  function updateTask(id, changes) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))
  }

  function addTask() {
    if (!newTask.name.trim()) return
    const task = {
      id: Date.now(),
      name: newTask.name.trim(),
      frequency: newTask.frequency,
      type: newTask.type,
      assignees: [],
      logs: [],
      memo: '',
    }
    if (newTask.type === 'rotation') {
      task.rotationOrder = []
      task.rotationIndex = 0
    }
    setTasks(prev => [...prev, task])
    setNewTask({ name: '', frequency: '不定期', type: 'fixed' })
    setShowAddModal(false)
  }

  function rotateNext(taskId) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId || t.type !== 'rotation') return t
      const order = t.rotationOrder || members.map(m => m.id)
      const nextIdx = ((t.rotationIndex || 0) + 1) % order.length
      return { ...t, rotationIndex: nextIdx, assignees: [order[nextIdx]] }
    }))
  }

  function markDone(taskId, doneMemberId) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const isProxy = !t.assignees.includes(doneMemberId)
      const newLog = {
        date: new Date().toISOString(),
        member: doneMemberId,
        isProxy,
      }
      const logs = [newLog, ...(t.logs || [])].slice(0, 10)
      return { ...t, logs }
    }))
    setDoneSelectingId(null)
  }

  function undoLog(taskId) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const logs = [...(t.logs || [])]
      logs.shift()
      return { ...t, logs }
    }))
  }

  function toggleRotationMember(taskId, memberId) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId || t.type !== 'rotation') return t
      const order = t.rotationOrder || []
      let newOrder
      if (order.includes(memberId)) {
        newOrder = order.filter(id => id !== memberId)
      } else {
        newOrder = [...order, memberId]
      }
      // rotationIndexを安全に保つ
      let newIdx = t.rotationIndex || 0
      if (newOrder.length === 0) {
        return { ...t, rotationOrder: newOrder, rotationIndex: 0, assignees: [] }
      }
      if (newIdx >= newOrder.length) {
        newIdx = 0
      }
      return { ...t, rotationOrder: newOrder, rotationIndex: newIdx, assignees: [newOrder[newIdx]] }
    }))
  }

  function removeAssignee(taskId, memberId) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      return { ...t, assignees: t.assignees.filter(a => a !== memberId) }
    }))
  }

  function toggleAssignee(taskId, memberId) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      if (t.assignees.includes(memberId)) {
        return { ...t, assignees: t.assignees.filter(a => a !== memberId) }
      }
      return { ...t, assignees: [...t.assignees, memberId] }
    }))
  }

  // --- Card drag (reorder) ---
  function handleCardDragStart(e, taskId) {
    e.dataTransfer.setData('text/plain', `card:${taskId}`)
    e.dataTransfer.effectAllowed = 'move'
    setDragState({ draggingId: taskId, overId: null, dragType: 'card' })
  }

  // --- Member drag (assign) ---
  function handleMemberDragStart(e, memberId) {
    e.dataTransfer.setData('text/plain', `member:${memberId}`)
    e.dataTransfer.effectAllowed = 'copy'
    setDragState({ draggingId: memberId, overId: null, dragType: 'member' })
  }

  function handleCardDragOver(e, overTaskId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = dragState.dragType === 'member' ? 'copy' : 'move'
    if (dragState.overId !== overTaskId) {
      setDragState(prev => ({ ...prev, overId: overTaskId }))
    }
  }

  function handleCardDrop(e, overTaskId) {
    e.preventDefault()
    const data = e.dataTransfer.getData('text/plain')

    if (data.startsWith('member:')) {
      const memberId = data.replace('member:', '')
      setTasks(prev => prev.map(t => {
        if (t.id !== overTaskId) return t
        if (t.assignees.includes(memberId)) return t
        return { ...t, assignees: [...t.assignees, memberId] }
      }))
    } else if (data.startsWith('card:')) {
      const draggedId = parseInt(data.replace('card:', ''))
      if (draggedId && draggedId !== overTaskId) {
        setTasks(prev => {
          const arr = [...prev]
          const fromIdx = arr.findIndex(t => t.id === draggedId)
          const toIdx = arr.findIndex(t => t.id === overTaskId)
          if (fromIdx === -1 || toIdx === -1) return prev
          const [item] = arr.splice(fromIdx, 1)
          arr.splice(toIdx, 0, item)
          return arr
        })
      }
    }
    setDragState({ draggingId: null, overId: null, dragType: null })
    setMemberDragOver(null)
  }

  function handleMemberAreaDragOver(e, memberId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setMemberDragOver(memberId)
  }

  function handleMemberAreaDrop(e, memberId) {
    e.preventDefault()
    const data = e.dataTransfer.getData('text/plain')
    if (data.startsWith('card:')) {
      const draggedId = parseInt(data.replace('card:', ''))
      if (draggedId) {
        updateTask(draggedId, { assignees: memberId ? [memberId] : [] })
      }
    }
    setDragState({ draggingId: null, overId: null, dragType: null })
    setMemberDragOver(null)
  }

  function handleDragEnd() {
    setDragState({ draggingId: null, overId: null, dragType: null })
    setMemberDragOver(null)
  }

  function renderTaskCard(task) {
    const typeConf = TYPE_CONFIG[task.type]
    const isEditing = editingId === task.id
    const isDragging = dragState.dragType === 'card' && dragState.draggingId === task.id
    const isDragOver = dragState.overId === task.id
    const isMemberDragOver = dragState.dragType === 'member' && dragState.overId === task.id
    const lastLog = (task.logs || [])[0]
    const isDoneSelecting = doneSelectingId === task.id

    return (
      <div
        key={task.id}
        draggable
        onDragStart={e => handleCardDragStart(e, task.id)}
        onDragOver={e => handleCardDragOver(e, task.id)}
        onDrop={e => handleCardDrop(e, task.id)}
        onDragEnd={handleDragEnd}
        style={{
          background: isMemberDragOver ? '#EFF6FF' : '#fff',
          borderRadius: 8,
          padding: '16px 18px',
          cursor: isDragging ? 'grabbing' : 'grab',
          border: isEditing ? '1px solid #E84855'
            : isMemberDragOver ? '2px dashed #3B82F6'
            : isDragOver ? '2px dashed #9B9A97'
            : '1px solid #E8E8E4',
          transition: 'all 0.15s ease',
          position: 'relative',
          zIndex: isEditing ? 50 : isDoneSelecting ? 40 : 1,
          opacity: isDragging ? 0.5 : 1,
        }}
        className="task-card"
        onClick={() => {
          if (isDoneSelecting) {
            setDoneSelectingId(null)
          } else {
            setEditingId(isEditing ? null : task.id)
          }
        }}
      >
        {/* Task Name */}
        <div style={{ fontSize: 15, fontWeight: 600, color: '#37352F', marginBottom: 8 }}>
          {task.name}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 600,
            padding: '2px 8px', borderRadius: 4,
            background: FREQ_COLORS[task.frequency] + '18',
            color: FREQ_COLORS[task.frequency],
          }}>
            {task.frequency}
          </span>
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 600,
            padding: '2px 8px', borderRadius: 4,
            background: typeConf.color + '18',
            color: typeConf.color,
          }}>
            {typeConf.emoji} {typeConf.label}
          </span>
        </div>

        {/* Assignees */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {task.assignees.length > 0 ? task.assignees.map(aid => (
            <div key={aid} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: getAvatarColor(aid) + '14',
              borderRadius: 14, padding: '2px 8px 2px 2px',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: getAvatarColor(aid),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff',
              }}>
                {getInitials(getMemberName(aid))}
              </div>
              <span style={{ fontSize: 12, color: '#37352F', fontWeight: 500 }}>
                {getShortName(aid)}
              </span>
              <button
                onClick={e => { e.stopPropagation(); removeAssignee(task.id, aid) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: '#9B9A97', padding: 0, lineHeight: 1,
                  fontFamily: 'inherit',
                }}
                title="担当を外す"
              >
                ×
              </button>
            </div>
          )) : (
            <span style={{ fontSize: 13, color: '#9B9A97' }}>未割当</span>
          )}
        </div>

        {/* Member drag hint on card */}
        {isMemberDragOver && (
          <div style={{
            fontSize: 11, color: '#3B82F6', fontWeight: 500, textAlign: 'center',
            padding: '4px 0',
          }}>
            ＋ 担当に追加
          </div>
        )}

        {/* Rotation: show all rotation members with current highlighted + next button */}
        {task.type === 'rotation' && task.rotationOrder && task.rotationOrder.length > 0 && (
          <div style={{ marginTop: 4, marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              {task.rotationOrder.map((mid, i) => {
                const isCurrent = i === (task.rotationIndex || 0)
                const isNext = i === ((task.rotationIndex || 0) + 1) % task.rotationOrder.length
                return (
                  <div key={mid} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <div style={{
                      width: isCurrent ? 24 : 18,
                      height: isCurrent ? 24 : 18,
                      borderRadius: '50%',
                      background: getAvatarColor(mid),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isCurrent ? 10 : 8, fontWeight: 700, color: '#fff',
                      border: isCurrent ? '2px solid #37352F' : isNext ? '2px dashed #9B9A97' : '1px solid transparent',
                      opacity: isCurrent ? 1 : isNext ? 0.8 : 0.4,
                      transition: 'all 0.15s',
                    }} title={getMemberName(mid) + (isCurrent ? '（今）' : isNext ? '（次）' : '')}>
                      {getInitials(getMemberName(mid))}
                    </div>
                    {i < task.rotationOrder.length - 1 && (
                      <span style={{ fontSize: 8, color: '#D1D5DB' }}>→</span>
                    )}
                  </div>
                )
              })}
            </div>
            <button
              className="filter-btn"
              style={{
                padding: '2px 10px', borderRadius: 4,
                fontSize: 11, fontWeight: 600, background: '#3B82F618',
                color: '#3B82F6', border: 'none',
              }}
              onClick={e => { e.stopPropagation(); rotateNext(task.id) }}
            >
              次の人へ →
            </button>
          </div>
        )}

        {/* Last log */}
        {lastLog && (
          <div style={{
            fontSize: 11, color: '#9B9A97', marginTop: 4,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span>✅</span>
            <span>
              前回: {formatDate(lastLog.date)} {getShortName(lastLog.member)}
              {lastLog.isProxy && <span style={{ color: '#F59E0B', fontWeight: 600 }}>（代行）</span>}
            </span>
          </div>
        )}

        {/* Memo preview */}
        {task.memo && !isEditing && (
          <div style={{
            fontSize: 11, color: '#6B7280', marginTop: 4,
            background: '#F7F7F5', borderRadius: 4, padding: '4px 8px',
            whiteSpace: 'pre-wrap', maxHeight: 40, overflow: 'hidden',
          }}>
            📝 {task.memo.length > 30 ? task.memo.substring(0, 30) + '…' : task.memo}
          </div>
        )}

        {/* Done button — opens member selector */}
        {!isEditing && !isDoneSelecting && (
          <button
            className="filter-btn"
            style={{
              position: 'absolute', top: 12, right: 12,
              padding: '3px 8px', borderRadius: 4,
              fontSize: 11, fontWeight: 600,
              background: '#10B98118', color: '#10B981', border: 'none',
            }}
            onClick={e => {
              e.stopPropagation()
              setDoneSelectingId(task.id)
              setEditingId(null)
            }}
            title="この雑務を完了する"
          >
            ✓ 完了する
          </button>
        )}

        {/* Done member selector dropdown */}
        {isDoneSelecting && (
          <div
            style={{
              position: 'absolute', top: 8, right: 8, zIndex: 20,
              background: '#fff', border: '1px solid #E8E8E4', borderRadius: 8,
              padding: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              minWidth: 180,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9B9A97', marginBottom: 6 }}>
              誰が対応しましたか？
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {members.map(m => {
                const isAssignee = task.assignees.includes(m.id)
                return (
                  <button
                    key={m.id}
                    className="filter-btn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 8px', borderRadius: 4, fontSize: 12,
                      background: isAssignee ? getAvatarColor(m.id) + '12' : 'transparent',
                      color: '#37352F', border: 'none', textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                    onClick={() => markDone(task.id, m.id)}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: getAvatarColor(m.id),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, fontWeight: 700, color: '#fff',
                    }}>
                      {getInitials(m.name)}
                    </div>
                    <span style={{ fontWeight: isAssignee ? 600 : 400 }}>{m.name}</span>
                    {!isAssignee && <span style={{ fontSize: 10, color: '#F59E0B' }}>代行</span>}
                  </button>
                )
              })}
            </div>
            <button
              className="filter-btn"
              style={{
                marginTop: 6, padding: '3px 8px', borderRadius: 4,
                fontSize: 11, color: '#9B9A97', background: '#F7F7F5',
                border: 'none', width: '100%', fontFamily: 'inherit',
              }}
              onClick={() => setDoneSelectingId(null)}
            >
              キャンセル
            </button>
          </div>
        )}

        {/* Edit panel */}
        {isEditing && (
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
              background: '#fff', border: '1px solid #E8E8E4', borderRadius: 8,
              padding: 14, marginTop: 4,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              maxHeight: 420, overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Type select */}
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', marginBottom: 6 }}>担当タイプ</div>
            <select
              value={task.type}
              onChange={e => {
                const changes = { type: e.target.value }
                if (e.target.value === 'rotation' && !task.rotationOrder) {
                  changes.rotationOrder = [...task.assignees]
                  changes.rotationIndex = 0
                }
                updateTask(task.id, changes)
              }}
              style={{
                width: '100%', padding: '6px 8px', fontSize: 13,
                border: '1px solid #E8E8E4', borderRadius: 6, background: '#F7F7F5',
                marginBottom: 10, fontFamily: 'inherit',
              }}
            >
              {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                <option key={key} value={key}>{conf.emoji} {conf.label}</option>
              ))}
            </select>

            {/* Rotation members (only for rotation type) */}
            {task.type === 'rotation' && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', marginBottom: 6 }}>🔄 ローテーション対象メンバー</div>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10,
                  background: '#EFF6FF', borderRadius: 6, padding: '8px 10px',
                  border: '1px solid #3B82F620',
                }}>
                  {members.map(m => {
                    const isInRotation = (task.rotationOrder || []).includes(m.id)
                    return (
                      <label
                        key={m.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          cursor: 'pointer', fontSize: 13, padding: '3px 0',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isInRotation}
                          onChange={() => toggleRotationMember(task.id, m.id)}
                          style={{ accentColor: '#3B82F6' }}
                        />
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: getAvatarColor(m.id),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, color: '#fff',
                        }}>
                          {getInitials(m.name)}
                        </div>
                        <span style={{ fontWeight: isInRotation ? 600 : 400, color: isInRotation ? '#37352F' : '#9B9A97' }}>
                          {m.name}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </>
            )}

            {/* Assignee checkboxes (for non-rotation types) */}
            {task.type !== 'rotation' && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', marginBottom: 6 }}>担当者（複数選択可）</div>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10,
                  background: '#F7F7F5', borderRadius: 6, padding: '8px 10px',
                }}>
                  {members.map(m => {
                    const isChecked = task.assignees.includes(m.id)
                    return (
                      <label
                        key={m.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          cursor: 'pointer', fontSize: 13, padding: '3px 0',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAssignee(task.id, m.id)}
                          style={{ accentColor: getAvatarColor(m.id) }}
                        />
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: getAvatarColor(m.id),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, color: '#fff',
                        }}>
                          {getInitials(m.name)}
                        </div>
                        <span style={{ fontWeight: isChecked ? 600 : 400, color: isChecked ? '#37352F' : '#9B9A97' }}>
                          {m.name}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </>
            )}

            {/* Memo */}
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', marginBottom: 6 }}>📝 メモ</div>
            <textarea
              value={task.memo || ''}
              onChange={e => updateTask(task.id, { memo: e.target.value })}
              placeholder="引き継ぎ事項、注意点など..."
              style={{
                width: '100%', padding: '6px 8px', fontSize: 12,
                border: '1px solid #E8E8E4', borderRadius: 6, background: '#F7F7F5',
                fontFamily: 'inherit', resize: 'vertical', minHeight: 50,
                marginBottom: 10,
              }}
            />

            {/* Logs with undo */}
            {task.logs && task.logs.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', marginBottom: 6 }}>📋 対応履歴（直近10件）</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {task.logs.map((log, i) => (
                    <div key={i} style={{
                      fontSize: 11, color: '#6B7280', padding: '3px 8px',
                      background: '#F7F7F5', borderRadius: 4,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span style={{ color: '#10B981' }}>✅</span>
                      <span>{formatDate(log.date)}</span>
                      <span style={{ fontWeight: 600 }}>
                        {getShortName(log.member)}
                      </span>
                      {log.isProxy && <span style={{ color: '#F59E0B', fontSize: 10, fontWeight: 600 }}>代行</span>}
                      {i === 0 && (
                        <button
                          className="filter-btn"
                          style={{
                            marginLeft: 'auto', padding: '1px 6px', borderRadius: 3,
                            fontSize: 10, color: '#E84855', background: '#E8485512',
                            border: 'none', fontFamily: 'inherit',
                          }}
                          onClick={() => undoLog(task.id)}
                          title="直近の完了を取り消す"
                        >
                          取り消し
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderMemberView() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {members.map(member => {
          const memberTasks = tasks.filter(t => t.assignees.includes(member.id))
          const isDragTarget = memberDragOver === member.id
          return (
            <div
              key={member.id}
              onDragOver={e => handleMemberAreaDragOver(e, member.id)}
              onDrop={e => handleMemberAreaDrop(e, member.id)}
              onDragLeave={() => setMemberDragOver(null)}
              style={{
                padding: 12, borderRadius: 8,
                border: isDragTarget ? '2px dashed #3B82F6' : '2px solid transparent',
                background: isDragTarget ? '#3B82F608' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: getAvatarColor(member.id),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#fff',
                }}>
                  {getInitials(member.name)}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#37352F' }}>{member.name}</div>
                  <div style={{ fontSize: 12, color: '#9B9A97' }}>{member.role}・{memberTasks.length}件</div>
                </div>
              </div>
              {memberTasks.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 10,
                }}>
                  {memberTasks.map(renderTaskCard)}
                </div>
              ) : (
                <div style={{
                  padding: '16px', textAlign: 'center', color: '#D1D5DB',
                  fontSize: 13, border: '1px dashed #E8E8E4', borderRadius: 8,
                }}>
                  カードをドラッグしてここにドロップ
                </div>
              )}
            </div>
          )
        })}
        {(() => {
          const unassigned = tasks.filter(t => t.assignees.length === 0)
          const isDragTarget = memberDragOver === 'unassigned'
          return (
            <div
              onDragOver={e => handleMemberAreaDragOver(e, null)}
              onDrop={e => handleMemberAreaDrop(e, null)}
              onDragLeave={() => setMemberDragOver(null)}
              style={{
                padding: 12, borderRadius: 8,
                border: isDragTarget ? '2px dashed #9B9A97' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: '#9B9A97', marginBottom: 12 }}>
                未割当（{unassigned.length}件）
              </div>
              {unassigned.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 10,
                }}>
                  {unassigned.map(renderTaskCard)}
                </div>
              ) : (
                <div style={{
                  padding: '16px', textAlign: 'center', color: '#D1D5DB',
                  fontSize: 13, border: '1px dashed #E8E8E4', borderRadius: 8,
                }}>
                  カードをドラッグして未割当にする
                </div>
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: 'sans-serif', color: '#9B9A97',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🧹</div>
          <div>読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans JP', sans-serif; background: #F7F7F5; color: #37352F; }
        .task-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); border-color: #D4D4D0 !important; transform: translateY(-1px); }
        .filter-btn { cursor: pointer; border: none; font-family: inherit; transition: all 0.15s; }
        .filter-btn:hover { opacity: 0.85; }
        select:focus, input:focus, textarea:focus { outline: none; border-color: #E84855 !important; }
        [draggable=true] { user-select: none; }
        .member-chip { cursor: grab; user-select: none; }
        .member-chip:active { cursor: grabbing; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }} onClick={() => { editingId && setEditingId(null); doneSelectingId && setDoneSelectingId(null) }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 28 }}>🧹</span>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#37352F' }}>We TASK</h1>
          </div>
          <p style={{ fontSize: 14, color: '#9B9A97' }}>チームの雑務を見える化するボード</p>
        </div>

        {/* Member Summary — draggable avatars */}
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20,
          padding: '14px 16px', background: '#fff', borderRadius: 8, border: '1px solid #E8E8E4',
        }}>
          {memberCounts.map(m => (
            <div
              key={m.id}
              draggable
              onDragStart={e => handleMemberDragStart(e, m.id)}
              onDragEnd={handleDragEnd}
              className="member-chip"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 6, fontSize: 13,
                background: filter === m.id ? getAvatarColor(m.id) + '18' : 'transparent',
                border: '2px solid transparent',
                transition: 'all 0.15s',
              }}
              onClick={() => setFilter(filter === m.id ? 'all' : m.id)}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: getAvatarColor(m.id),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff',
              }}>
                {getInitials(m.name)}
              </div>
              <span style={{ fontWeight: 500 }}>{m.name.split(' ')[0]}</span>
              <span style={{
                background: '#F0F0EE', borderRadius: 10, padding: '1px 7px',
                fontSize: 12, fontWeight: 600, color: '#37352F',
              }}>
                {m.count}
              </span>
            </div>
          ))}
          {unassignedCount > 0 && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 6, fontSize: 13,
                background: filter === 'unassigned' ? '#F0F0EE' : 'transparent',
                cursor: 'pointer',
              }}
              onClick={() => setFilter(filter === 'unassigned' ? 'all' : 'unassigned')}
            >
              <span style={{ color: '#9B9A97' }}>未割当</span>
              <span style={{
                background: '#FEE2E2', borderRadius: 10, padding: '1px 7px',
                fontSize: 12, fontWeight: 600, color: '#E84855',
              }}>
                {unassignedCount}
              </span>
            </div>
          )}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 6, fontSize: 13,
              cursor: 'pointer', color: '#9B9A97',
            }}
            onClick={() => setShowAddMemberModal(true)}
          >
            <span style={{
              width: 22, height: 22, borderRadius: '50%', background: '#E8E8E4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600, color: '#9B9A97',
            }}>＋</span>
            <span style={{ fontSize: 12 }}>追加</span>
          </div>
        </div>

        {/* Drag hint */}
        {dragState.dragType === 'member' && (
          <div style={{
            textAlign: 'center', padding: '8px 0', marginBottom: 8,
            fontSize: 12, color: '#3B82F6', fontWeight: 500,
            background: '#EFF6FF', borderRadius: 6,
          }}>
            👤 メンバーをカードにドロップして担当に追加
          </div>
        )}
        {dragState.dragType === 'card' && (
          <div style={{
            textAlign: 'center', padding: '8px 0', marginBottom: 8,
            fontSize: 12, color: '#6B7280', fontWeight: 500,
          }}>
            💡 カード同士でドロップして順番を入れ替え
          </div>
        )}

        {/* Controls */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 18, flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 4, background: '#fff', borderRadius: 8, padding: 3, border: '1px solid #E8E8E4' }}>
            <button
              className="filter-btn"
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                background: view === 'board' ? '#37352F' : 'transparent',
                color: view === 'board' ? '#fff' : '#9B9A97',
              }}
              onClick={() => setView('board')}
            >
              ボード
            </button>
            <button
              className="filter-btn"
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                background: view === 'member' ? '#37352F' : 'transparent',
                color: view === 'member' ? '#fff' : '#9B9A97',
              }}
              onClick={() => setView('member')}
            >
              メンバー別
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { key: 'all', label: 'すべて' },
                { key: 'flexible', label: '🤝 フレキシブル' },
                { key: 'unassigned', label: '未割当' },
              ].map(f => (
                <button
                  key={f.key}
                  className="filter-btn"
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    background: filter === f.key ? '#37352F' : '#fff',
                    color: filter === f.key ? '#fff' : '#9B9A97',
                    border: filter === f.key ? 'none' : '1px solid #E8E8E4',
                  }}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              className="filter-btn"
              style={{
                padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: '#E84855', color: '#fff', border: 'none',
              }}
              onClick={() => setShowAddModal(true)}
            >
              ＋ 雑務を追加
            </button>
          </div>
        </div>

        {/* Task Grid */}
        {view === 'board' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}>
            {filteredTasks.map(renderTaskCard)}
          </div>
        ) : (
          renderMemberView()
        )}

        {filteredTasks.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            color: '#9B9A97', fontSize: 14,
          }}>
            該当する雑務がありません
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12, padding: 28, width: '90%', maxWidth: 420,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#37352F' }}>
              ＋ 雑務を追加
            </h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', display: 'block', marginBottom: 4 }}>雑務名</label>
              <input
                type="text"
                value={newTask.name}
                onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                placeholder="例: 会議室の予約管理"
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 14,
                  border: '1px solid #E8E8E4', borderRadius: 6, fontFamily: 'inherit',
                }}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', display: 'block', marginBottom: 4 }}>頻度</label>
              <select
                value={newTask.frequency}
                onChange={e => setNewTask({ ...newTask, frequency: e.target.value })}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 14,
                  border: '1px solid #E8E8E4', borderRadius: 6, fontFamily: 'inherit',
                }}
              >
                <option value="週1">週1</option>
                <option value="月1">月1</option>
                <option value="不定期">不定期</option>
              </select>
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', display: 'block', marginBottom: 4 }}>担当タイプ</label>
              <select
                value={newTask.type}
                onChange={e => setNewTask({ ...newTask, type: e.target.value })}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 14,
                  border: '1px solid #E8E8E4', borderRadius: 6, fontFamily: 'inherit',
                }}
              >
                {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                  <option key={key} value={key}>{conf.emoji} {conf.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="filter-btn"
                style={{
                  padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                  background: '#F0F0EE', color: '#37352F', border: 'none',
                }}
                onClick={() => setShowAddModal(false)}
              >
                キャンセル
              </button>
              <button
                className="filter-btn"
                style={{
                  padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  background: '#E84855', color: '#fff', border: 'none',
                  opacity: newTask.name.trim() ? 1 : 0.5,
                }}
                onClick={addTask}
                disabled={!newTask.name.trim()}
              >
                追加する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }}
          onClick={() => setShowAddMemberModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12, padding: 28, width: '90%', maxWidth: 380,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#37352F' }}>
              👤 メンバーを追加
            </h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', display: 'block', marginBottom: 4 }}>名前</label>
              <input
                type="text"
                value={newMember.name}
                onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="例: 山田太郎"
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 14,
                  border: '1px solid #E8E8E4', borderRadius: 6, fontFamily: 'inherit',
                }}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', display: 'block', marginBottom: 4 }}>役割</label>
              <input
                type="text"
                value={newMember.role}
                onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                placeholder="例: デザイナー"
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 14,
                  border: '1px solid #E8E8E4', borderRadius: 6, fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="filter-btn"
                style={{
                  padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                  background: '#F0F0EE', color: '#37352F', border: 'none',
                }}
                onClick={() => setShowAddMemberModal(false)}
              >
                キャンセル
              </button>
              <button
                className="filter-btn"
                style={{
                  padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  background: '#3B82F6', color: '#fff', border: 'none',
                  opacity: newMember.name.trim() ? 1 : 0.5,
                }}
                onClick={addMember}
                disabled={!newMember.name.trim()}
              >
                追加する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
