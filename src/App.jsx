import { useState, useRef, useCallback } from 'react'

const MEMBERS = [
  { id: 'fukuda', name: '福田将己', role: '代表取締役' },
  { id: 'sandou', name: 'サンドウ タカユキ', role: '取締役' },
  { id: 'koga', name: '古賀光紗', role: 'モーション' },
  { id: 'takamori', name: '高森奈央子', role: 'モーション・デザイン' },
  { id: 'morioka', name: '森岡夏実', role: 'モーション・デザイン' },
  { id: 'masuno', name: '増野雄亮', role: 'モーション' },
  { id: 'sakai', name: '酒井沙貴', role: 'PM' },
]

const ALL_MEMBER_IDS = MEMBERS.map(m => m.id)

const INITIAL_TASKS = [
  { id: 1, name: 'オフィスの掃除', frequency: '週1', type: 'rotation', assignees: ['koga'], rotationOrder: [...ALL_MEMBER_IDS], rotationIndex: 2, logs: [], memo: '' },
  { id: 2, name: 'トイレ掃除', frequency: '週1', type: 'rotation', assignees: ['masuno'], rotationOrder: [...ALL_MEMBER_IDS], rotationIndex: 5, logs: [], memo: '' },
  { id: 3, name: 'オフィスのゴミ捨て', frequency: '不定期', type: 'flexible', assignees: [], logs: [], memo: '' },
  { id: 4, name: '月曜定例管理', frequency: '週1', type: 'fixed', assignees: ['sakai'], logs: [], memo: '' },
  { id: 5, name: 'イベント場所探し', frequency: '不定期', type: 'fixed', assignees: ['sandou'], logs: [], memo: '' },
  { id: 6, name: '備品購入', frequency: '不定期', type: 'fixed', assignees: ['takamori'], logs: [], memo: '' },
  { id: 7, name: '郵便物の管理', frequency: '不定期', type: 'flexible', assignees: [], logs: [], memo: '' },
  { id: 8, name: 'PC・ソフトのアカウント管理', frequency: '不定期', type: 'fixed', assignees: ['fukuda'], logs: [], memo: '' },
  { id: 9, name: '契約書管理', frequency: '不定期', type: 'fixed', assignees: ['sakai'], logs: [], memo: '' },
  { id: 10, name: 'セキュリティ管理', frequency: '不定期', type: 'fixed', assignees: ['fukuda'], logs: [], memo: '' },
  { id: 11, name: 'プラグイン・ストレージ管理', frequency: '不定期', type: 'fixed', assignees: ['morioka'], logs: [], memo: '' },
  { id: 12, name: 'NAS整理', frequency: '月1', type: 'fixed', assignees: ['masuno'], logs: [], memo: '' },
  { id: 13, name: 'We Share Comp整理', frequency: '月1', type: 'fixed', assignees: ['takamori'], logs: [], memo: '' },
  { id: 14, name: 'HP整理', frequency: '月1', type: 'fixed', assignees: ['sandou'], logs: [], memo: '' },
]

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

function getMemberName(id) {
  if (!id) return null
  const m = MEMBERS.find(m => m.id === id)
  return m ? m.name : null
}

function getShortName(id) {
  const name = getMemberName(id)
  if (!name) return '?'
  return name.length > 3 ? name.substring(0, 3) : name
}

function getInitials(name) {
  if (!name) return '?'
  return name.charAt(0)
}

function getAvatarColor(id) {
  const colors = ['#E84855', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4']
  if (!id) return '#D1D5DB'
  const idx = MEMBERS.findIndex(m => m.id === id)
  return colors[idx % colors.length]
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function App() {
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const [view, setView] = useState('board')
  const [filter, setFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTask, setNewTask] = useState({ name: '', frequency: '不定期', type: 'fixed' })
  const [dragState, setDragState] = useState({ draggingId: null, overId: null, dragType: null })
  const [memberDragOver, setMemberDragOver] = useState(null)
  // 完了ボタン押下時の対応者選択UI用state
  const [doneSelectingId, setDoneSelectingId] = useState(null)

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true
    if (filter === 'flexible') return t.type === 'flexible'
    if (filter === 'unassigned') return t.assignees.length === 0
    return t.assignees.includes(filter)
  })

  const memberCounts = MEMBERS.map(m => ({
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
      task.rotationOrder = [...ALL_MEMBER_IDS]
      task.rotationIndex = 0
    }
    setTasks(prev => [...prev, task])
    setNewTask({ name: '', frequency: '不定期', type: 'fixed' })
    setShowAddModal(false)
  }

  function rotateNext(taskId) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId || t.type !== 'rotation') return t
      const order = t.rotationOrder || ALL_MEMBER_IDS
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

        {/* Rotation: simple current assignee + next button (no full list) */}
        {task.type === 'rotation' && task.rotationOrder && (
          <div style={{
            marginTop: 4, marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 11, color: '#9B9A97' }}>次の担当:</span>
            {(() => {
              const order = task.rotationOrder
              const nextIdx = ((task.rotationIndex || 0) + 1) % order.length
              const nextId = order[nextIdx]
              return (
                <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 600 }}>
                  {getMemberName(nextId)}
                </span>
              )
            })()}
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
              {MEMBERS.map(m => {
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
            {/* Assignee checkboxes */}
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', marginBottom: 6 }}>担当者（複数選択可）</div>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10,
              background: '#F7F7F5', borderRadius: 6, padding: '8px 10px',
            }}>
              {MEMBERS.map(m => {
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

            {/* Type select */}
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', marginBottom: 6 }}>担当タイプ</div>
            <select
              value={task.type}
              onChange={e => {
                const changes = { type: e.target.value }
                if (e.target.value === 'rotation' && !task.rotationOrder) {
                  changes.rotationOrder = [...ALL_MEMBER_IDS]
                  changes.rotationIndex = task.assignees[0] ? ALL_MEMBER_IDS.indexOf(task.assignees[0]) : 0
                  if (changes.rotationIndex === -1) changes.rotationIndex = 0
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
        {MEMBERS.map(member => {
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
    </>
  )
}
