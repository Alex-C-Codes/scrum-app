import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Column as ColumnType, Task } from '../types'
import { TASK_COLORS } from '../types'
import { TaskCard } from './TaskCard'
import { useScrumStore } from '../store/useScrumStore'

interface Props {
  column: ColumnType
  tasks: Task[]
}

export function Column({ column, tasks }: Props) {
  const [addingTask, setAddingTask] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState(TASK_COLORS[0])
  const [editingTitle, setEditingTitle] = useState(false)
  const [colTitle, setColTitle] = useState(column.title)

  const { addTask, renameColumn, deleteColumn } = useScrumStore()

  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column' } })

  const sorted = [...tasks].sort((a, b) => a.order - b.order)

  const submitTask = () => {
    if (newTitle.trim()) {
      addTask(column.id, column.projectId, newTitle.trim(), newDesc, newColor)
      setNewTitle('')
      setNewDesc('')
      setNewColor(TASK_COLORS[0])
      setAddingTask(false)
    }
  }

  const saveColTitle = () => {
    if (colTitle.trim()) renameColumn(column.id, colTitle.trim())
    else setColTitle(column.title)
    setEditingTitle(false)
  }

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        {editingTitle ? (
          <input
            autoFocus
            className="font-bold text-sm bg-transparent border-b border-gray-400 outline-none flex-1"
            value={colTitle}
            onChange={(e) => setColTitle(e.target.value)}
            onBlur={saveColTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') saveColTitle(); if (e.key === 'Escape') { setColTitle(column.title); setEditingTitle(false) } }}
          />
        ) : (
          <button
            className="font-bold text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1"
            onDoubleClick={() => setEditingTitle(true)}
            title="Double-click to rename"
          >
            {column.title}
            <span className="text-xs font-normal text-gray-400 bg-gray-200 rounded-full px-1.5">
              {tasks.length}
            </span>
          </button>
        )}
        <button
          className="text-gray-400 hover:text-red-400 text-lg leading-none ml-2"
          onClick={() => { if (confirm(`Delete column "${column.title}"?`)) deleteColumn(column.id) }}
          title="Delete column"
        >
          ×
        </button>
      </div>

      {/* Tasks area */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 p-2 rounded-xl min-h-32 transition-colors ${isOver ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-gray-100'}`}
      >
        <SortableContext items={sorted.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {sorted.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {addingTask ? (
          <div className="rounded-lg p-3 shadow-sm border border-black/10 flex flex-col gap-2 bg-white">
            <input
              autoFocus
              className="w-full font-semibold text-sm outline-none border-b border-gray-200 pb-1"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitTask(); if (e.key === 'Escape') setAddingTask(false) }}
              placeholder="Task title"
            />
            <textarea
              className="w-full text-xs outline-none resize-none text-gray-600"
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
            />
            <div className="flex gap-1">
              {TASK_COLORS.map((c) => (
                <button
                  key={c}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: c === newColor ? '#374151' : 'transparent' }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button className="text-xs px-2 py-1 rounded hover:bg-gray-100" onClick={() => setAddingTask(false)}>Cancel</button>
              <button className="text-xs px-2 py-1 rounded bg-gray-800 text-white hover:bg-gray-700" onClick={submitTask}>Add</button>
            </div>
          </div>
        ) : (
          <button
            className="text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg p-2 text-left transition-colors"
            onClick={() => setAddingTask(true)}
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  )
}
