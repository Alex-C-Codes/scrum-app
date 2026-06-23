import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../types'
import { TASK_COLORS } from '../types'
import { useScrumStore } from '../store/useScrumStore'

interface Props {
  task: Task
}

export function TaskCard({ task }: Props) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [color, setColor] = useState(task.color)
  const { updateTask, deleteTask } = useScrumStore()

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
      updateTask(task.id, { title: title.trim(), description, color })
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div
        className="rounded-lg p-3 shadow-md border border-black/10 flex flex-col gap-2"
        style={{ backgroundColor: color }}
      >
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
        <div className="flex gap-1 flex-wrap">
          {TASK_COLORS.map((c) => (
            <button
              key={c}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: c === color ? '#374151' : 'transparent',
              }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            className="text-xs px-2 py-1 rounded hover:bg-black/10"
            onClick={() => { setTitle(task.title); setDescription(task.description); setColor(task.color); setEditing(false) }}
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
      <button
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 transition-opacity"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }}
      >
        ×
      </button>
      <p className="text-xs text-gray-400 mt-2">Double-click to edit</p>
    </div>
  )
}
