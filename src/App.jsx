import { useState } from 'react'

const MEMBERS = [
  { id: 'fukuda', name: '福田将己', role: '代表取締役' },
  { id: 'sandou', name: 'サンドウ タカユキ', role: '取締役' },
  { id: 'koga', name: '古賀光紗', role: 'モーション' },
  { id: 'takamori', name: '高森奈央子', role: 'モーション・デザイン' },
  { id: 'morioka', name: '森岡夏実', role: 'モーション・デザイン' },
  { id: 'masuno', name: '増野雄亮', role: 'モーション' },
  { id: 'sakai', name: '酒井沙貴', role: 'PM' },
]

const INITIAL_TASKS = [
  { id: 1, name: 'オフィスの掃除', frequency: '週1', type: 'rotation', assignee: 'koga' },
  { id: 2, name: 'トイレ掃除', frequency: '週1', type: 'rotation', assignee: 'masuno' },
  { id: 3, name: 'オフィスのゴミ捨て', frequency: '不定期', type: 'flexible', assignee: null },
  { id: 4, name: '月曜定例管理', frequency: '週1', type: 'fixed', assignee: 'sakai' },
  { id: 5, name: 'イベント場所探し', frequency: '不定期', type: 'fixed', assignee: 'sandou' },
  { id: 6, name: '備品購入', frequency: '不定期', type: 'fixed', assignee: 'takamori' },
  { id: 7, name: '郵便物の管理', frequency: '不定期', type: 'flexible', assignee: null },
  { id: 8, name: 'PC・ソフトのアカウント管理', frequency: '不定期', type: 'fixed', assignee: 'fukuda' },
  { id: 9, name: '契約書管理', frequency: '不定期', type: 'fixed', assignee: 'sakai' },
  { id: 10, name: 'セキュリティ管理', frequency: '不定期', type: 'fixed', assignee: 'fukuda' },
  { id: 11, name: 'プラグイン・ストレージ管理', frequency: '不定期', type: 'fixed', assignee: 'morioka' },
  { id: 12, name: 'NAS整理', frequency: '月1', type: 'fixed', assignee: 'masuno' },
  { id: 13, name: 'We Share Comp整理', frequency: '月1', type: 'fixed', assignee: 'takamori' },
  { id: 14, name: 'HP整理', frequency: '月1', type: 'fixed', assignee: 'sandou' },
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

export default function App() {
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const [view, setView] = useState('board')
  const [filter, setFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTask, setNewTask] = useState({ name: '', frequency: '不定期', type: 'fixed' })

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true
    if (filter === 'flexible') return t.type === 'flexible'
    if (filter === 'unassigned') return !t.assignee
    return t.assignee === filter
  })

  const memberCounts = MEMBERS.map(m => ({
    ...m,
    count: tasks.filter(t => t.assignee === m.id).length
  }))

  const unassignedCount = tasks.filter(t => !t.assignee).length

  function updateTask(id, changes) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))
  }

  function addTask() {
    if (!newTask.name.trim()) return
    setTasks(prev => [...prev, {
      id: Date.now(),
      name: newTask.name.trim(),
      frequency: newTask.frequency,
      type: newTask.type,
      assignee: null,
    }])
    setNewTask({ name: '', frequency: '不定期', type: 'fixed' })
    setShowAddModal(false)
  }

  function renderTaskCard(task) {
    const typeConf = TYPE_CONFIG[task.type]
    const assigneeName = getMemberName(task.assignee)
    const isEditing = editingId === task.id

    return (
      <div
        key={task.id}
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: '16px 18px',
          cursor: 'pointer',
          border: '1px solid #E8E8E4',
          transition: 'all 0.15s ease',
          position: 'relative',
        }}
        className="task-card"
        onClick={() => setEditingId(isEditing ? null : task.id)}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: '#37352F', marginBottom: 10 }}>
          {task.name}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 4,
            background: FREQ_COLORS[task.frequency] + '18',
            color: FREQ_COLORS[task.frequency],
          }}>
            {task.frequency}
          </span>
          <span style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 4,
            background: typeConf.color + '18',
            color: typeConf.color,
          }}>
            {typeConf.emoji} {typeConf.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: getAvatarColor(task.assignee),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
          }}>
            {getInitials(assigneeName)}
          </div>
          <span style={{ fontSize: 13, color: assigneeName ? '#37352F' : '#9B9A97' }}>
            {assigneeName || '未割当'}
          </span>
        </div>

        {isEditing && (
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
              background: '#fff', border: '1px solid #E8E8E4', borderRadius: 8,
              padding: 14, marginTop: 4,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', marginBottom: 6 }}>担当者</div>
            <select
              value={task.assignee || ''}
              onChange={e => updateTask(task.id, { assignee: e.target.value || null })}
              style={{
                width: '100%', padding: '6px 8px', fontSize: 13,
                border: '1px solid #E8E8E4', borderRadius: 6, background: '#F7F7F5',
                marginBottom: 10, fontFamily: 'inherit',
              }}
            >
              <option value="">未割当</option>
              {MEMBERS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9B9A97', marginBottom: 6 }}>担当タイプ</div>
            <select
              value={task.type}
              onChange={e => updateTask(task.id, { type: e.target.value })}
              style={{
                width: '100%', padding: '6px 8px', fontSize: 13,
                border: '1px solid #E8E8E4', borderRadius: 6, background: '#F7F7F5',
                fontFamily: 'inherit',
              }}
            >
              {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                <option key={key} value={key}>{conf.emoji} {conf.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    )
  }

  function renderMemberView() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {MEMBERS.map(member => {
          const memberTasks = tasks.filter(t => t.assignee === member.id)
          if (memberTasks.length === 0) return null
          return (
            <div key={member.id}>
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
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 10,
              }}>
                {memberTasks.map(renderTaskCard)}
              </div>
            </div>
          )
        })}
        {(() => {
          const unassigned = tasks.filter(t => !t.assignee)
          if (unassigned.length === 0) return null
          return (
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#9B9A97', marginBottom: 12 }}>
                未割当（{unassigned.length}件）
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 10,
              }}>
                {unassigned.map(renderTaskCard)}
              </div>
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
        .task-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); border-color: #D4D4D0; transform: translateY(-1px); }
        .filter-btn { cursor: pointer; border: none; font-family: inherit; transition: all 0.15s; }
        .filter-btn:hover { opacity: 0.85; }
        select:focus, input:focus { outline: none; border-color: #E84855 !important; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 28 }}>🧹</span>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#37352F' }}>We TASK</h1>
          </div>
          <p style={{ fontSize: 14, color: '#9B9A97' }}>チームの雑務を見える化するボード</p>
        </div>

        {/* Member Summary */}
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20,
          padding: '14px 16px', background: '#fff', borderRadius: 8, border: '1px solid #E8E8E4',
        }}>
          {memberCounts.map(m => (
            <div
              key={m.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 6, fontSize: 13,
                background: filter === m.id ? getAvatarColor(m.id) + '18' : 'transparent',
                cursor: 'pointer',
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
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
