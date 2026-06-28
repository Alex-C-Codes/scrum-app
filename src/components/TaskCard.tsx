import { useState, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { v4 as uuid } from 'uuid'
import type { Task, ChecklistItem } from '../types'
import { TASK_COLORS } from '../types'
import { useScrumStore } from '../store/useScrumStore'

function getInitials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

interface Props {
  task: Task
}

export function TaskCard({ task }: Props) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [color, setColor] = useState(task.color)
  const [assigneeId, setAssigneeId] = useState<string | null>(task.assigneeId)
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist)
  const [newMemberName, setNewMemberName] = useState('')
  const [newItemText, setNewItemText] = useState('')
  const newItemRef = useRef<HTMLInputElement>(null)

  const { updateTask, deleteTask, addToDaily, dailyTasks, members, addMember } = useScrumStore()
  const todayStr = new Date().toLocaleDateString('en-CA')
  const isInToday = dailyTasks.some((dt) => dt.taskId === task.id && dt.date === todayStr)
  const assignee = members.find((m) => m.id === task.assigneeId)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    backgroundColor: task.color,
  }

  const save = () => {
    if (title.trim()) {
      updateTask(task.id, { title: title.trim(), description, color, assigneeId, checklist })
    }
    setEditing(false)
  }

  const openEdit = () => {
    setTitle(task.title)
    setDescription(task.description)
    setColor(task.color)
    setAssigneeId(task.assigneeId)
    setChecklist(task.checklist)
    setEditing(true)
  }

  const handleAddMember = () => {
    if (!newMemberName.trim()) return
    const id = addMember(newMemberName.trim())
    setAssigneeId(id)
    setNewMemberName('')
  }

  // ── Checklist helpers (edit mode) ──────────────────────────────────────────

  const addChecklistItem = () => {
    if (!newItemText.trim()) return
    setChecklist((prev) => [...prev, { id: uuid(), text: newItemText.trim(), checked: false }])
    setNewItemText('')
    setTimeout(() => newItemRef.current?.focus(), 0)
  }

  const removeChecklistItem = (id: string) =>
    setChecklist((prev) => prev.filter((i) => i.id !== id))

  const updateChecklistItemText = (id: string, text: string) =>
    setChecklist((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)))

  const toggleChecklistItemEdit = (id: string) =>
    setChecklist((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)))

  // ── Checklist toggle in view mode (persists immediately) ───────────────────

  const toggleChecklistItemView = (itemId: string) => {
    const newChecklist = task.checklist.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i))
    updateTask(task.id, { checklist: newChecklist })
  }

  const doneCount = task.checklist.filter((i) => i.checked).length
  const totalCount = task.checklist.length

  // ── Edit mode ──────────────────────────────────────────────────────────────

  if (editing) {
    return (
      <div className="rounded-lg p-3 shadow-md border border-black/10 flex flex-col gap-2" style={{ backgroundColor: color }}>
        <input
          autoFocus
          className="w-full bg-transparent font-semibold text-sm outline-none border-b border-black/20 pb-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Task title"
        />
        <textarea
          className="w-full bg-transparent text-xs outline-none resize-none"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
        />

        {/* Color picker */}
        <div className="flex gap-1 flex-wrap">
          {TASK_COLORS.map((c) => (
            <button
              key={c}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{ backgroundColor: c, borderColor: c === color ? '#374151' : 'transparent' }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        {/* Checklist */}
        <div className="flex flex-col gap-1 border-t border-black/10 pt-2">
          <p className="text-xs font-medium text-gray-600">Checklist</p>
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5 group/ci">
              <button
                className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  item.checked ? 'bg-gray-700 border-gray-700' : 'border-gray-400 hover:border-gray-600'
                }`}
                onClick={() => toggleChecklistItemEdit(item.id)}
              >
                {item.checked && (
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <polyline points="1.5 5 4 7.5 8.5 2"/>
                  </svg>
                )}
              </button>
              <input
                className={`flex-1 bg-transparent text-xs outline-none border-b border-transparent focus:border-black/20 ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}
                value={item.text}
                onChange={(e) => updateChecklistItemText(item.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); newItemRef.current?.focus() }
                  if (e.key === 'Backspace' && !item.text) removeChecklistItem(item.id)
                }}
              />
              <button
                className="opacity-0 group-hover/ci:opacity-100 text-gray-400 hover:text-red-400 text-base leading-none flex-shrink-0 transition-opacity"
                onClick={() => removeChecklistItem(item.id)}
              >×</button>
            </div>
          ))}
          {/* Add new item */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-3.5 h-3.5 rounded border-2 border-dashed border-gray-300 flex-shrink-0" />
            <input
              ref={newItemRef}
              className="flex-1 bg-transparent text-xs outline-none border-b border-transparent focus:border-black/20 placeholder-gray-400"
              placeholder="Add item…"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem() } }}
              onBlur={() => { if (newItemText.trim()) addChecklistItem() }}
            />
          </div>
        </div>

        {/* Assignee */}
        <div className="flex flex-col gap-1.5 border-t border-black/10 pt-2">
          <p className="text-xs font-medium text-gray-600">Assign to</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                assigneeId === null
                  ? 'bg-black/10 border-black/20 text-gray-700 font-medium'
                  : 'border-black/10 text-gray-500 hover:bg-black/5'
              }`}
              onClick={() => setAssigneeId(null)}
            >
              Unassigned
            </button>
            {members.map((m) => (
              <button
                key={m.id}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  assigneeId === m.id
                    ? 'border-black/20 font-medium'
                    : 'border-black/10 text-gray-600 hover:bg-black/5'
                }`}
                style={assigneeId === m.id ? { backgroundColor: m.color + '33', borderColor: m.color + '88' } : {}}
                onClick={() => setAssigneeId(m.id)}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: m.color, fontSize: '9px' }}
                >
                  {getInitials(m.name)}
                </span>
                {m.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              className="flex-1 bg-white/50 text-xs rounded px-2 py-1 outline-none border border-black/15 placeholder-gray-400"
              placeholder="Add new member…"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
            />
            <button
              className="px-2 py-1 rounded bg-black/10 hover:bg-black/20 text-xs font-medium"
              onClick={handleAddMember}
            >
              Add
            </button>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            className="text-xs px-2 py-1 rounded hover:bg-black/10"
            onClick={() => { setTitle(task.title); setDescription(task.description); setColor(task.color); setAssigneeId(task.assigneeId); setChecklist(task.checklist); setEditing(false) }}
          >
            Cancel
          </button>
          <button
            className="text-xs px-2 py-1 rounded bg-gray-800 text-white hover:bg-gray-700"
            onClick={save}
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  // ── View mode ──────────────────────────────────────────────────────────────

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-lg p-3 shadow-md border border-black/10 cursor-grab active:cursor-grabbing group relative"
      onDoubleClick={openEdit}
    >
      <p className="font-semibold text-sm text-gray-800 break-words pr-6">{task.title}</p>
      {task.description && (
        <p className="text-xs text-gray-600 mt-1 break-words">{task.description}</p>
      )}

      {/* Checklist in view mode */}
      {totalCount > 0 && (
        <div className="mt-2 flex flex-col gap-1" onPointerDown={(e) => e.stopPropagation()}>
          {/* Progress bar */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1 bg-black/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-600 rounded-full transition-all"
                style={{ width: `${(doneCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">{doneCount}/{totalCount}</span>
          </div>
          {/* Items */}
          {task.checklist.map((item) => (
            <div key={item.id} className="flex items-start gap-1.5">
              <button
                className={`mt-0.5 w-3.5 h-3.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  item.checked ? 'bg-gray-600 border-gray-600' : 'border-gray-400 hover:border-gray-600'
                }`}
                onClick={(e) => { e.stopPropagation(); toggleChecklistItemView(item.id) }}
              >
                {item.checked && (
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <polyline points="1.5 5 4 7.5 8.5 2"/>
                  </svg>
                )}
              </button>
              <span className={`text-xs break-words ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Assignee avatar */}
      {assignee && (
        <div className="flex items-center gap-1 mt-2">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ backgroundColor: assignee.color, fontSize: '9px' }}
            title={assignee.name}
          >
            {getInitials(assignee.name)}
          </span>
          <span className="text-xs text-gray-500 truncate">{assignee.name}</span>
        </div>
      )}

      <button
        className="absolute top-1.5 right-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 text-gray-500 hover:text-red-500 text-xs w-6 h-6 md:w-5 md:h-5 flex items-center justify-center rounded hover:bg-black/10 transition-opacity"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }}
      >
        ×
      </button>
      <button
        className={`absolute bottom-1.5 right-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 text-xs w-6 h-6 md:w-5 md:h-5 flex items-center justify-center rounded hover:bg-black/10 transition-opacity ${isInToday ? 'text-indigo-500' : 'text-gray-400 hover:text-indigo-500'}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); addToDaily(task.id, todayStr) }}
        title={isInToday ? 'Already in today' : 'Add to today'}
      >
        {isInToday ? '★' : '☆'}
      </button>
      <p className="hidden md:block text-xs text-gray-400 mt-2">Double-click to edit</p>
    </div>
  )
}
