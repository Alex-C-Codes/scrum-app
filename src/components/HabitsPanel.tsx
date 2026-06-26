import { useState } from 'react'
import { useScrumStore } from '../store/useScrumStore'
import { TASK_COLORS, describeRecurrence } from '../types'
import type { RecurrenceRule } from '../types'

const DAY_LABELS = ['S','M','T','W','T','F','S']
const WEEK_OPTS  = ['First','Second','Third','Fourth','Fifth']
const DAY_NAMES  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

// ─── Recurrence selector ──────────────────────────────────────────────────────

function RecurrenceSelector({ value, onChange }: { value: RecurrenceRule; onChange: (r: RecurrenceRule) => void }) {
  const setType = (type: string) => {
    if (type === 'daily')            onChange({ type: 'daily' })
    if (type === 'weekly')           onChange({ type: 'weekly', days: [1,2,3,4,5] })
    if (type === 'monthly_date')     onChange({ type: 'monthly_date', dayOfMonth: 1 })
    if (type === 'monthly_weekday')  onChange({ type: 'monthly_weekday', week: 1, day: 5 })
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        className="w-full text-xs bg-white/60 rounded border border-black/15 px-2 py-1.5 outline-none"
        value={value.type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="daily">Every day</option>
        <option value="weekly">Specific days of the week</option>
        <option value="monthly_date">Day of each month</option>
        <option value="monthly_weekday">Weekday of each month (e.g. first Friday)</option>
      </select>

      {value.type === 'weekly' && (
        <div className="flex gap-1">
          {DAY_LABELS.map((label, day) => {
            const active = value.days.includes(day)
            return (
              <button
                key={day}
                type="button"
                className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => {
                  const days = active ? value.days.filter((d) => d !== day) : [...value.days, day]
                  onChange({ type: 'weekly', days })
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {value.type === 'monthly_date' && (
        <select
          className="w-full text-xs bg-white/60 rounded border border-black/15 px-2 py-1.5 outline-none"
          value={value.dayOfMonth}
          onChange={(e) => onChange({ type: 'monthly_date', dayOfMonth: Number(e.target.value) })}
        >
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}{['st','nd','rd'][d-1] ?? 'th'} of each month</option>
          ))}
        </select>
      )}

      {value.type === 'monthly_weekday' && (
        <div className="flex gap-2">
          <select
            className="flex-1 text-xs bg-white/60 rounded border border-black/15 px-2 py-1.5 outline-none"
            value={value.week}
            onChange={(e) => onChange({ ...value, week: Number(e.target.value) as 1|2|3|4|5 })}
          >
            {WEEK_OPTS.map((label, i) => <option key={i} value={i+1}>{label}</option>)}
          </select>
          <select
            className="flex-1 text-xs bg-white/60 rounded border border-black/15 px-2 py-1.5 outline-none"
            value={value.day}
            onChange={(e) => onChange({ ...value, day: Number(e.target.value) })}
          >
            {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

// ─── HabitsPanel ──────────────────────────────────────────────────────────────

interface Props { projectId: string }

export function HabitsPanel({ projectId }: Props) {
  const { habits, addHabit, updateHabit, deleteHabit } = useScrumStore()

  const [adding, setAdding]         = useState(false)
  const [newTitle, setNewTitle]     = useState('')
  const [newColor, setNewColor]     = useState(TASK_COLORS[0])
  const [newRec, setNewRec]         = useState<RecurrenceRule>({ type: 'daily' })

  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editTitle, setEditTitle]   = useState('')
  const [editColor, setEditColor]   = useState('')
  const [editRec, setEditRec]       = useState<RecurrenceRule>({ type: 'daily' })

  const projectHabits = habits.filter((h) => h.projectId === projectId)

  const submit = () => {
    if (!newTitle.trim()) return
    addHabit(newTitle.trim(), projectId, newColor, newRec)
    setNewTitle(''); setNewColor(TASK_COLORS[0]); setNewRec({ type: 'daily' }); setAdding(false)
  }

  const saveEdit = (id: string) => {
    if (editTitle.trim()) updateHabit(id, { title: editTitle.trim(), color: editColor, recurrence: editRec })
    setEditingId(null)
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Daily Habits</h3>
            <p className="text-xs text-gray-400 mt-0.5">Repeating goals that appear automatically in Daily Tasks</p>
          </div>
          {!adding && (
            <button className="text-xs text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50" onClick={() => setAdding(true)}>
              + Add habit
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {projectHabits.map((habit) =>
            editingId === habit.id ? (
              <div key={habit.id} className="flex flex-col gap-2 rounded-lg p-3 border border-gray-200 bg-white" style={{ borderLeftColor: editColor, borderLeftWidth: 3 }}>
                <input
                  autoFocus
                  className="text-sm font-medium outline-none bg-transparent"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(habit.id); if (e.key === 'Escape') setEditingId(null) }}
                />
                <div className="flex gap-1">
                  {TASK_COLORS.map((c) => (
                    <button key={c} className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: c === editColor ? '#374151' : 'transparent' }}
                      onClick={() => setEditColor(c)} />
                  ))}
                </div>
                <RecurrenceSelector value={editRec} onChange={setEditRec} />
                <div className="flex gap-1">
                  <button className="text-xs px-2 py-0.5 rounded text-gray-500 hover:bg-gray-100" onClick={() => setEditingId(null)}>Cancel</button>
                  <button className="text-xs px-2 py-0.5 rounded bg-gray-800 text-white hover:bg-gray-700" onClick={() => saveEdit(habit.id)}>Save</button>
                </div>
              </div>
            ) : (
              <div key={habit.id} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-white border border-gray-200 group" style={{ borderLeftColor: habit.color, borderLeftWidth: 3 }}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{habit.title}</p>
                  <p className="text-xs text-gray-400">{describeRecurrence(habit.recurrence)}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button className="text-xs text-gray-400 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100"
                    onClick={() => { setEditingId(habit.id); setEditTitle(habit.title); setEditColor(habit.color); setEditRec(habit.recurrence) }}>
                    Edit
                  </button>
                  <button className="text-xs text-gray-400 hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-red-50"
                    onClick={() => { if (confirm(`Delete "${habit.title}"?`)) deleteHabit(habit.id) }}>
                    Delete
                  </button>
                </div>
              </div>
            )
          )}

          {projectHabits.length === 0 && !adding && (
            <p className="text-sm text-gray-400 py-2">No habits yet. Add one to track recurring goals.</p>
          )}

          {adding && (
            <div className="flex flex-col gap-2 rounded-lg p-3 border border-indigo-200 bg-white">
              <input
                autoFocus
                className="text-sm font-medium outline-none bg-transparent placeholder-gray-400"
                placeholder="e.g. Draw for 20 minutes"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setAdding(false) }}
              />
              <div className="flex gap-1">
                {TASK_COLORS.map((c) => (
                  <button key={c} className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: c === newColor ? '#374151' : 'transparent' }}
                    onClick={() => setNewColor(c)} />
                ))}
              </div>
              <RecurrenceSelector value={newRec} onChange={setNewRec} />
              <div className="flex gap-1">
                <button className="text-xs px-2 py-0.5 rounded text-gray-500 hover:bg-gray-100" onClick={() => setAdding(false)}>Cancel</button>
                <button className="text-xs px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-500" onClick={submit}>Add</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
