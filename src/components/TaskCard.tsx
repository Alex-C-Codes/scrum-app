import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../types'
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
  const [newMemberName, setNewMemberName] = useState('')

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
      updateTask(task.id, { title: title.trim(), description, color, assigneeId })
    }
    setEditing(false)
  }

  const handleAddMember = () => {
    if (!newMemberName.trim()) return
    const id = addMember(newMemberName.trim())
    setAssigneeId(id)
    setNewMemberName('')
  }

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
          rows={3}
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
          {/* Add new member inline */}
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
            onClick={() => { setTitle(task.title); setDescription(task.description); setColor(task.color); setAssigneeId(task.assigneeId); setEditing(false) }}
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-lg p-3 shadow-md border border-black/10 cursor-grab active:cursor-grabbing group relative"
      onDoubleClick={() => setEditing(true)}
    >
      <p className="font-semibold text-sm text-gray-800 break-words">{task.title}</p>
      {task.description && (
        <p className="text-xs text-gray-600 mt-1 break-words">{task.description}</p>
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
