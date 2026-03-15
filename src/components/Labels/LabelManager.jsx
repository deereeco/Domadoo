import { useState } from 'react'
import { useStore } from '../../store/useStore.js'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#6366f1', '#a855f7', '#ec4899',
  '#64748b', '#0ea5e9',
]

export default function LabelManager() {
  const { labels, addLabel, updateLabel, deleteLabel, setShowLabelManager } = useStore()
  const [editingId, setEditingId] = useState(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[5])

  const handleCreate = () => {
    if (!newName.trim()) return
    addLabel({ name: newName.trim(), color: newColor })
    setNewName('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setShowLabelManager(false)}
    >
      <div
        className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-700">
          <h2 className="font-semibold text-zinc-900 dark:text-white">Label Manager</h2>
          <button
            onClick={() => setShowLabelManager(false)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80dvh] overflow-y-auto">
          {/* Create new */}
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="New label name…"
              className="flex-1 text-sm px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 placeholder-zinc-400 outline-none"
              style={{ fontSize: '16px' }}
            />
            <div className="flex gap-1 flex-wrap w-24">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    newColor === c ? 'border-zinc-900 dark:border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c, touchAction: 'manipulation' }}
                />
              ))}
            </div>
            <button
              onClick={handleCreate}
              className="px-3 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
            >
              Add
            </button>
          </div>

          {/* Existing labels (system labels are hidden) */}
          <div className="space-y-1">
            {Object.values(labels).filter(l => !l.isSystem).map(label => (
              <LabelRow
                key={label.id}
                label={label}
                isEditing={editingId === label.id}
                onEdit={() => setEditingId(label.id)}
                onSave={(name, color) => {
                  updateLabel(label.id, { name, color })
                  setEditingId(null)
                }}
                onDelete={() => deleteLabel(label.id)}
                onCancel={() => setEditingId(null)}
              />
            ))}
            {Object.values(labels).filter(l => !l.isSystem).length === 0 && (
              <p className="text-sm text-zinc-400 text-center py-4">No labels yet. Create one above.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function LabelRow({ label, isEditing, onEdit, onSave, onDelete, onCancel }) {
  const [name, setName] = useState(label.name)
  const [color, setColor] = useState(label.color)

  const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#6366f1', '#a855f7', '#ec4899',
    '#64748b', '#0ea5e9',
  ]

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-750">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 text-sm px-2 py-1 rounded bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 outline-none border border-zinc-200 dark:border-zinc-600"
          style={{ fontSize: '16px' }}
        />
        <div className="flex gap-1">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-4 h-4 rounded-full border-2 ${color === c ? 'border-zinc-900 dark:border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c, touchAction: 'manipulation' }}
            />
          ))}
        </div>
        <button onClick={() => onSave(name, color)} className="text-xs text-indigo-500 font-medium">Save</button>
        <button onClick={onCancel} className="text-xs text-zinc-400">Cancel</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-750 group">
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
      <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-200">{label.name}</span>
      <div className="hidden group-hover:flex items-center gap-1">
        <button onClick={onEdit} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 px-1">Edit</button>
        <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-500 px-1">Delete</button>
      </div>
    </div>
  )
}
