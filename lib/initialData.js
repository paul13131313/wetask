export const INITIAL_MEMBERS = [
  { id: 'fukuda', name: '福田将己', role: '代表取締役' },
  { id: 'sandou', name: 'サンドウ タカユキ', role: '取締役' },
  { id: 'koga', name: '古賀光紗', role: 'モーション' },
  { id: 'takamori', name: '高森奈央子', role: 'モーション・デザイン' },
  { id: 'morioka', name: '森岡夏実', role: 'モーション・デザイン' },
  { id: 'masuno', name: '増野雄亮', role: 'モーション' },
  { id: 'sakai', name: '酒井沙貴', role: 'PM' },
]

export const INITIAL_TASKS = [
  { id: 1, name: 'オフィスの掃除', frequency: '週1', type: 'rotation', assignees: ['koga'], rotationOrder: ['koga', 'masuno', 'morioka'], rotationIndex: 0, logs: [], memo: '' },
  { id: 2, name: 'トイレ掃除', frequency: '週1', type: 'rotation', assignees: ['masuno'], rotationOrder: ['fukuda', 'sandou', 'koga', 'takamori', 'morioka', 'masuno', 'sakai'], rotationIndex: 5, logs: [], memo: '' },
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
