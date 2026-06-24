import { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useScrumStore } from '../store/useScrumStore'
import type { DailyTask, Task } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateStr = (d: Date) => d.toLocaleDateString('en-CA') // YYYY-MM-DD

const formatDate = (dateStr: string) => {
  const [y, m, day] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, day)
  const todayStr = toDateStr(new Date())
  if (dateStr === todayStr) return 'Today'
  if (dateStr === toDateStr(new Date(Date.now() + 86400000))) return 'Tomorrow'
  if (dateStr === toDateStr(new Date(Date.now() - 86400000))) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

const shiftDate = (dateStr: string, days: number) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return toDateStr(date)
}

// ─── Sortable priority item ───────────────────────────────────────────────────

function PriorityItem({ dailyTask, rank, task, projectName, columnName }: {
  dailyTask: DailyTask
  rank: number
  task: Task
  projectName: string
  columnName: string
}) {
  const { removeFromDaily } = useScrumStore()
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: dailyTask.id,
    data: { type: 'priority-item' },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, backgroundColor: task.color }}
      className="flex items-start gap-3 rounded-lg px-3 py-2.5 shadow-sm border border-black/10 group/item"
    >
      <span
        {...attributes} {...listeners}
        className="mt-0.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0 pt-0.5"
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="3" cy="3" r="1.2"/><circle cx="7" cy="3" r="1.2"/>
          <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
          <circle cx="3" cy="11" r="1.2"/><circle cx="7" cy="11" r="1.2"/>
        </svg>
      </span>
      <span className="w-5 h-5 rounded-full bg-black/10 text-gray-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{task.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{projectName} · {columnName}</p>
      </div>
      <button
        className="opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-red-400 text-lg leading-none flex-shrink-0"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => removeFromDaily(dailyTask.id)}
        title="Remove from today"
      >×</button>
    </div>
  )
}

// ─── Draggable picker task ────────────────────────────────────────────────────

function PickerTask({ task, alreadyAdded }: { task: Task; alreadyAdded: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { type: 'picker-task' },
    disabled: alreadyAdded,
  })

  return (
    <div
      ref={setNodeRef}
      {...(alreadyAdded ? {} : { ...attributes, ...listeners })}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
        alreadyAdded
          ? 'text-gray-400 bg-gray-50 cursor-default'
          : 'text-gray-700 hover:bg-gray-100 cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'opacity-40' : ''}`}
      style={{ backgroundColor: alreadyAdded ? undefined : task.color + '55' }}
    >
      {alreadyAdded
        ? <span className="text-green-500 text-xs">✓</span>
        : <span className="text-gray-400 text-xs">⠿</span>
      }
      <span className="truncate flex-1">{task.title}</span>
    </div>
  )
}

// ─── Empty drop zone ──────────────────────────────────────────────────────────

function EmptyDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: 'priority-list-empty', data: { type: 'priority-list' } })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex items-center justify-center rounded-xl border-2 border-dashed transition-colors min-h-40 ${
        isOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
      }`}
    >
      <p className="text-sm text-gray-400 text-center px-4">
        {isOver ? 'Drop to add' : 'Drag tasks here from the panel →'}
      </p>
    </div>
  )
}

// ─── DailyView ────────────────────────────────────────────────────────────────

export function DailyView() {
  const { projects, columns, tasks, dailyTasks, addToDaily, reorderDailyTasks } = useScrumStore()
  const [date, setDate] = useState(toDateStr(new Date()))
  const [search, setSearch] = useState('')
  const [activeDrag, setActiveDrag] = useState<{ type: 'picker-task' | 'priority-item'; id: string } | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const todayEntries = dailyTasks
    .filter((dt) => dt.date === date)
    .sort((a, b) => a.order - b.order)

  const assignedTaskIds = new Set(todayEntries.map((dt) => dt.taskId))

  // Tasks in the picker: all tasks, filtered by search
  const pickerTasks = tasks.filter((t) => {
    if (!search) return true
    return t.title.toLowerCase().includes(search.toLowerCase())
  })

  // Group picker tasks by project
  const projectsWithTasks = projects
    .map((p) => ({ project: p, tasks: pickerTasks.filter((t) => t.projectId === p.id) }))
    .filter((g) => g.tasks.length > 0)

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveDrag({ type: active.data.current?.type, id: active.id as string })
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDrag(null)
    if (!over) return

    const activeType = active.data.current?.type
    const overType = over.data.current?.type

    if (activeType === 'picker-task') {
      const taskId = active.id as string
      if (overType === 'priority-item') {
        const overIndex = todayEntries.findIndex((dt) => dt.id === over.id)
        addToDaily(taskId, date, overIndex === -1 ? todayEntries.length : overIndex)
      } else {
        addToDaily(taskId, date)
      }
    } else if (activeType === 'priority-item') {
      const oldIndex = todayEntries.findIndex((dt) => dt.id === active.id)
      const newIndex = todayEntries.findIndex((dt) => dt.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderDailyTasks(date, arrayMove(todayEntries, oldIndex, newIndex).map((dt) => dt.id))
      }
    }
  }

  const activeDragTask = activeDrag
    ? tasks.find((t) => t.id === (activeDrag.type === 'picker-task' ? activeDrag.id : todayEntries.find((dt) => dt.id === activeDrag.id)?.taskId))
    : null

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setDate(shiftDate(date, -1))} className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{formatDate(date)}</h2>
            <p className="text-xs text-gray-400">{date}</p>
          </div>
          <button onClick={() => setDate(shiftDate(date, 1))} className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          {date !== toDateStr(new Date()) && (
            <button onClick={() => setDate(toDateStr(new Date()))} className="text-xs text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50">
              Jump to today
            </button>
          )}
        </div>
        <span className="text-sm text-gray-500">{todayEntries.length} task{todayEntries.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Body */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex-1 flex overflow-hidden">

          {/* Priority list */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Priority</h3>
            {todayEntries.length === 0 ? (
              <EmptyDropZone />
            ) : (
              <SortableContext items={todayEntries.map((dt) => dt.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {todayEntries.map((dt, i) => {
                    const task = tasks.find((t) => t.id === dt.taskId)
                    if (!task) return null
                    const project = projects.find((p) => p.id === task.projectId)
                    const column = columns.find((c) => c.id === task.columnId)
                    return (
                      <PriorityItem
                        key={dt.id}
                        dailyTask={dt}
                        rank={i + 1}
                        task={task}
                        projectName={project?.name ?? 'Unknown'}
                        columnName={column?.title ?? 'Unknown'}
                      />
                    )
                  })}
                </div>
              </SortableContext>
            )}
          </div>

          {/* Divider */}
          <div className="w-px bg-gray-200 flex-shrink-0" />

          {/* Task picker */}
          <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden border-l border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Add Tasks</h3>
              <input
                className="w-full text-sm bg-gray-100 rounded-lg px-3 py-1.5 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-300"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
              {projectsWithTasks.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No tasks found</p>
              )}
              {projectsWithTasks.map(({ project, tasks: pts }) => (
                <div key={project.id}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1">{project.name}</p>
                  <div className="flex flex-col gap-0.5">
                    {pts.map((t) => (
                      <PickerTask key={t.id} task={t} alreadyAdded={assignedTaskIds.has(t.id)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragTask && (
            <div className="rounded-lg px-3 py-2 shadow-xl text-sm font-semibold text-gray-800 rotate-1 opacity-95 border border-black/10 w-56" style={{ backgroundColor: activeDragTask.color }}>
              {activeDragTask.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
