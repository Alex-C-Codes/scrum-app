import { useState, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { v4 as uuid } from 'uuid'
import type { Column as ColumnType, Task, ChecklistItem } from '../types'
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
  const [newChecklist, setNewChecklist] = useState<ChecklistItem[]>([])
  const [newItemText, setNewItemText] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [colTitle, setColTitle] = useState(column.title)
  const newItemRef = useRef<HTMLInputElement>(null)

  const { addTask, renameColumn, deleteColumn } = useScrumStore()

  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column' } })

  const sorted = [...tasks].sort((a, b) => a.order - b.order)

  const addChecklistItem = () => {
    if (!newItemText.trim()) return
    setNewChecklist((prev) => [...prev, { id: uuid(), text: newItemText.trim(), checked: false }])
    setNewItemText('')
    setTimeout(() => newItemRef.current?.focus(), 0)
  }

  const removeChecklistItem = (id: string) =>
    setNewChecklist((prev) => prev.filter((i) => i.id !== id))

  const submitTask = () => {
    if (!newTitle.trim()) return
    // Flush any pending checklist item text
    const finalChecklist = newItemText.trim()
      ? [...newChecklist, { id: uuid(), text: newItemText.trim(), checked: false }]
      : newChecklist
    addTask(column.id, column.projectId, newTitle.trim(), newDesc, newColor, finalChecklist)
    setNewTitle('')
    setNewDesc('')
    setNewColor(TASK_COLORS[0])
    setNewChecklist([])
    setNewItemText('')
    setAddingTask(false)
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

            {/* Checklist */}
            <div className="flex flex-col gap-1 border-t border-gray-100 pt-2">
              <p className="text-xs font-medium text-gray-500">Checklist</p>
              {newChecklist.map((item) => (
                <div key={item.id} className="flex items-center gap-1.5 group/ci">
                  <div className="w-3.5 h-3.5 rounded border-2 border-gray-300 flex-shrink-0" />
                  <span className="flex-1 text-xs text-gray-700 truncate">{item.text}</span>
                  <button
                    className="opacity-0 group-hover/ci:opacity-100 text-gray-400 hover:text-red-400 text-base leading-none flex-shrink-0 transition-opacity"
                    onClick={() => removeChecklistItem(item.id)}
                  >×</button>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded border-2 border-dashed border-gray-300 flex-shrink-0" />
                <input
                  ref={newItemRef}
                  className="flex-1 text-xs outline-none border-b border-transparent focus:border-gray-200 placeholder-gray-400"
                  placeholder="Add checklist item…"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem() } }}
                />
              </div>
            </div>

            <div className="flex gap-1 border-t border-gray-100 pt-2">
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
              <button className="text-xs px-2 py-1 rounded hover:bg-gray-100" onClick={() => { setAddingTask(false); setNewChecklist([]); setNewItemText('') }}>Cancel</button>
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
