import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useScrumStore } from '../store/useScrumStore'
import { Column } from './Column'
import { TaskCard } from './TaskCard'
import { HabitsPanel } from './HabitsPanel'
import type { Task } from '../types'

export function Board() {
  const { projects, columns, tasks, activeProjectId, addColumn, reorderTasks, moveTask } =
    useScrumStore()

  const [newColTitle, setNewColTitle] = useState('')
  const [addingCol, setAddingCol] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const project = projects.find((p) => p.id === activeProjectId)
  const projectColumns = columns
    .filter((c) => c.projectId === activeProjectId)
    .sort((a, b) => a.order - b.order)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const getColumnIdForItem = (id: string): string | null => {
    const col = columns.find((c) => c.id === id)
    if (col) return col.id
    const task = tasks.find((t) => t.id === id)
    if (task) return task.columnId
    return null
  }

  const onDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find((t) => t.id === active.id)
    if (task) setActiveTask(task)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTask = tasks.find((t) => t.id === activeId)
    if (!activeTask) return

    const overColumnId = getColumnIdForItem(overId)
    if (!overColumnId) return

    if (activeTask.columnId === overColumnId) {
      // Reorder within same column
      const colTasks = tasks.filter((t) => t.columnId === overColumnId).sort((a, b) => a.order - b.order)
      const oldIndex = colTasks.findIndex((t) => t.id === activeId)
      const newIndex = colTasks.findIndex((t) => t.id === overId)
      if (oldIndex !== newIndex && newIndex !== -1) {
        const reordered = arrayMove(colTasks, oldIndex, newIndex)
        reorderTasks(overColumnId, reordered.map((t) => t.id))
      }
    } else {
      // Move to different column
      const overColTasks = tasks.filter((t) => t.columnId === overColumnId && t.id !== activeId).sort((a, b) => a.order - b.order)
      const overTaskIndex = overColTasks.findIndex((t) => t.id === overId)
      const insertAt = overTaskIndex === -1 ? overColTasks.length : overTaskIndex
      moveTask(activeId, overColumnId, insertAt)
    }
  }

  if (!project) return null

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Board header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">{project.name}</h2>
        <span className="text-sm text-gray-500">{projectColumns.length} columns · {tasks.filter((t) => t.projectId === activeProjectId).length} tasks</span>
      </div>

      {/* Columns + Habits scrollable area */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="overflow-x-auto p-6 flex-shrink-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 items-start">
            {projectColumns.map((col) => (
              <Column
                key={col.id}
                column={col}
                tasks={tasks.filter((t) => t.columnId === col.id)}
              />
            ))}

            {/* Add column */}
            <div className="w-72 flex-shrink-0">
              {addingCol ? (
                <div className="bg-gray-100 rounded-xl p-3 flex flex-col gap-2">
                  <input
                    autoFocus
                    className="w-full font-semibold text-sm bg-white rounded px-2 py-1 outline-none border border-gray-300"
                    value={newColTitle}
                    onChange={(e) => setNewColTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newColTitle.trim()) {
                        addColumn(activeProjectId!, newColTitle.trim())
                        setNewColTitle('')
                        setAddingCol(false)
                      }
                      if (e.key === 'Escape') setAddingCol(false)
                    }}
                    placeholder="Column name"
                  />
                  <div className="flex gap-2">
                    <button className="text-xs px-2 py-1 rounded hover:bg-gray-200" onClick={() => setAddingCol(false)}>Cancel</button>
                    <button
                      className="text-xs px-2 py-1 rounded bg-gray-800 text-white hover:bg-gray-700"
                      onClick={() => {
                        if (newColTitle.trim()) {
                          addColumn(activeProjectId!, newColTitle.trim())
                          setNewColTitle('')
                          setAddingCol(false)
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="w-full text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl p-3 text-left transition-colors"
                  onClick={() => setAddingCol(true)}
                >
                  + Add column
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="rotate-2 opacity-90">
                <TaskCard task={activeTask} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
        </div>
        <HabitsPanel projectId={activeProjectId!} />
      </div>
    </div>
  )
}
