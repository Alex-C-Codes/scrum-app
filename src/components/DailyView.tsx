import { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useScrumStore } from '../store/useScrumStore'
import type { DailyTask, Habit, HabitCompletion, Task } from '../types'
import { isHabitScheduledOn } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateStr = (d: Date) => d.toLocaleDateString('en-CA')

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
  return toDateStr(new Date(y, m - 1, d + days))
}

// ─── Empty priority drop zone ─────────────────────────────────────────────────

function EmptyPriorityZone() {
  const { setNodeRef, isOver } = useDroppable({ id: 'priority-zone', data: { type: 'priority-zone' } })
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center justify-center rounded-xl border-2 border-dashed min-h-32 transition-all ${
        isOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
      }`}
    >
      <p className={`text-sm transition-colors ${isOver ? 'text-indigo-500 font-medium' : 'text-gray-400'}`}>
        {isOver ? '+ Add to today' : 'Drag tasks here from the panel →'}
      </p>
    </div>
  )
}

// ─── Done drop zone ───────────────────────────────────────────────────────────

function DoneDropZone({ isEmpty }: { isEmpty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'done-zone', data: { type: 'done-zone' } })
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center justify-center rounded-xl border-2 border-dashed transition-all ${
        isOver
          ? 'border-green-400 bg-green-50 py-5'
          : isEmpty
          ? 'border-gray-200 py-3'
          : 'border-gray-200 py-2'
      }`}
    >
      <span className={`text-sm transition-colors ${isOver ? 'text-green-500 font-medium' : 'text-gray-400'}`}>
        {isOver ? '✓ Mark as done' : '↓ Drag here to complete'}
      </span>
    </div>
  )
}

// ─── Sortable priority item ───────────────────────────────────────────────────

function PriorityItem({ dailyTask, rank, task, projectName, columnName }: {
  dailyTask: DailyTask; rank: number; task: Task; projectName: string; columnName: string
}) {
  const { removeFromDaily, toggleDailyTaskComplete } = useScrumStore()
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: dailyTask.id,
    data: { type: 'priority-item' },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, backgroundColor: task.color }}
      className="flex items-start gap-2 rounded-lg px-3 py-2.5 shadow-sm border border-black/10 group/item"
    >
      <span {...attributes} {...listeners} className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="3" cy="3" r="1.2"/><circle cx="7" cy="3" r="1.2"/>
          <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
          <circle cx="3" cy="11" r="1.2"/><circle cx="7" cy="11" r="1.2"/>
        </svg>
      </span>
      <span className="w-5 h-5 rounded-full bg-black/10 text-gray-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{task.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{projectName} · {columnName}</p>
      </div>
      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover/item:opacity-100">
        <button
          className="w-6 h-6 rounded-full border-2 border-green-400 text-green-500 hover:bg-green-50 flex items-center justify-center text-xs font-bold"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => toggleDailyTaskComplete(dailyTask.id)}
          title="Mark as done"
        >✓</button>
        <button
          className="w-6 h-6 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-50 flex items-center justify-center text-base leading-none"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => removeFromDaily(dailyTask.id)}
          title="Remove"
        >×</button>
      </div>
    </div>
  )
}

// ─── Completed item ───────────────────────────────────────────────────────────

function CompletedItem({ dailyTask, task, projectName }: {
  dailyTask: DailyTask; task: Task; projectName: string
}) {
  const { removeFromDaily, toggleDailyTaskComplete } = useScrumStore()
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 border border-gray-200 bg-gray-50 group/done">
      <button
        className="w-5 h-5 rounded-full border-2 border-green-400 bg-green-400 text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
        onClick={() => toggleDailyTaskComplete(dailyTask.id)}
        title="Mark as incomplete"
      >✓</button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-400 line-through truncate">{task.title}</p>
        <p className="text-xs text-gray-400 truncate">{projectName}</p>
      </div>
      <button
        className="opacity-0 group-hover/done:opacity-100 text-gray-300 hover:text-red-400 text-base leading-none"
        onClick={() => removeFromDaily(dailyTask.id)}
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
        alreadyAdded ? 'text-gray-400 cursor-default' : 'text-gray-700 hover:bg-gray-100 cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'opacity-40' : ''}`}
      style={{ backgroundColor: alreadyAdded ? undefined : task.color + '55' }}
    >
      {alreadyAdded ? <span className="text-green-500 text-xs">✓</span> : <span className="text-gray-400 text-xs">⠿</span>}
      <span className="truncate flex-1">{task.title}</span>
    </div>
  )
}

// ─── Habit helpers ────────────────────────────────────────────────────────────

function countScheduledBetween(habit: Habit, start: string, end: string): number {
  let count = 0
  const d = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  while (d <= e) {
    if (isHabitScheduledOn(habit.recurrence, d.toLocaleDateString('en-CA'))) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

function getHabitStats(habit: Habit, completions: HabitCompletion[], today: string) {
  const t = new Date(today + 'T00:00:00')
  const dow = t.getDay()
  const monday = new Date(t)
  monday.setDate(t.getDate() - (dow === 0 ? 6 : dow - 1))
  const weekStart  = monday.toLocaleDateString('en-CA')
  const monthStart = today.slice(0, 7) + '-01'

  const hc = completions.filter((c) => c.habitId === habit.id)
  const weekDone   = hc.filter((c) => c.date >= weekStart  && c.date <= today).length
  const monthDone  = hc.filter((c) => c.date >= monthStart && c.date <= today).length
  const weekSched  = countScheduledBetween(habit, weekStart,  today)
  const monthSched = countScheduledBetween(habit, monthStart, today)

  const dots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(t)
    d.setDate(t.getDate() - (6 - i))
    const ds = d.toLocaleDateString('en-CA')
    return {
      date: ds,
      scheduled: isHabitScheduledOn(habit.recurrence, ds),
      done: hc.some((c) => c.date === ds),
    }
  })

  return { weekDone, weekSched, monthDone, monthSched, dots }
}

function HabitRow({ habit, today, completions }: { habit: Habit; today: string; completions: HabitCompletion[] }) {
  const { toggleHabitCompletion, projects } = useScrumStore()
  const isDone = completions.some((c) => c.habitId === habit.id && c.date === today)
  const project = projects.find((p) => p.id === habit.projectId)
  const { weekDone, weekSched, monthDone, monthSched, dots } = getHabitStats(habit, completions, today)

  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-colors ${isDone ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
      <button
        onClick={() => toggleHabitCompletion(habit.id, today)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          isDone ? 'border-green-400 bg-green-400 text-white' : 'border-gray-300 hover:border-green-400'
        }`}
      >
        {isDone && <span className="text-xs font-bold">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{habit.title}</p>
        <p className="text-xs text-gray-400">{project?.name}</p>
      </div>
      {/* Last 7 days dots — only show scheduled days */}
      <div className="flex gap-0.5 flex-shrink-0 items-center">
        {dots.map((d, i) => (
          d.scheduled
            ? <div key={i} className="w-2.5 h-2.5 rounded-full border" title={d.date}
                style={{ backgroundColor: d.done ? habit.color : 'transparent', borderColor: d.done ? habit.color : '#d1d5db' }} />
            : <div key={i} className="w-2.5 h-2.5" />
        ))}
      </div>
      {/* Stats */}
      {weekSched > 0 && (
        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-gray-500 font-medium">{weekDone}/{weekSched} <span className="text-gray-400 font-normal">wk</span></p>
          <p className="text-xs text-gray-500 font-medium">{monthDone}/{monthSched} <span className="text-gray-400 font-normal">mo</span></p>
        </div>
      )}
    </div>
  )
}

// ─── DailyView ────────────────────────────────────────────────────────────────

export function DailyView() {
  const { projects, columns, tasks, dailyTasks, habits, habitCompletions, dailyViewDate, setDailyViewDate, addToDaily, reorderDailyTasks, toggleDailyTaskComplete } = useScrumStore()
  const date = dailyViewDate
  const setDate = setDailyViewDate
  const [search, setSearch] = useState('')
  const [activeDrag, setActiveDrag] = useState<{ type: string; id: string } | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const allDayEntries = dailyTasks.filter((dt) => dt.date === date)
  const priorityEntries = allDayEntries.filter((dt) => !dt.completed).sort((a, b) => a.order - b.order)
  const completedEntries = allDayEntries.filter((dt) => dt.completed).sort((a, b) => a.order - b.order)
  const assignedTaskIds = new Set(allDayEntries.map((dt) => dt.taskId))

  const doneColumnIds = new Set(columns.filter((c) => c.title.toLowerCase() === 'done').map((c) => c.id))
  const pickerTasks = tasks.filter((t) =>
    !doneColumnIds.has(t.columnId) &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()))
  )
  const projectsWithTasks = projects
    .map((p) => ({ project: p, tasks: pickerTasks.filter((t) => t.projectId === p.id) }))
    .filter((g) => g.tasks.length > 0)

  const onDragStart = ({ active }: DragStartEvent) =>
    setActiveDrag({ type: active.data.current?.type, id: active.id as string })

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDrag(null)
    if (!over) return

    const activeType = active.data.current?.type
    const overType = over.data.current?.type

    if (activeType === 'picker-task') {
      const taskId = active.id as string
      const overIndex = overType === 'priority-item' ? priorityEntries.findIndex((dt) => dt.id === over.id) : -1
      addToDaily(taskId, date, overIndex === -1 ? priorityEntries.length : overIndex)
    } else if (activeType === 'priority-item') {
      if (overType === 'done-zone') {
        toggleDailyTaskComplete(active.id as string)
      } else if (overType === 'priority-item') {
        const oldIndex = priorityEntries.findIndex((dt) => dt.id === active.id)
        const newIndex = priorityEntries.findIndex((dt) => dt.id === over.id)
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          reorderDailyTasks(date, arrayMove(priorityEntries, oldIndex, newIndex).map((dt) => dt.id))
        }
      }
    }
  }

  const activeDragTask = activeDrag ? tasks.find((t) =>
    t.id === (activeDrag.type === 'picker-task'
      ? activeDrag.id
      : allDayEntries.find((dt) => dt.id === activeDrag.id)?.taskId)
  ) : null

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
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {completedEntries.length > 0 && <span className="text-green-500 font-medium">{completedEntries.length} done</span>}
          <span>{priorityEntries.length} remaining</span>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex-1 flex overflow-hidden">

          {/* Left: priority + done */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-4">

            {/* Priority list */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Priority</h3>
              {priorityEntries.length === 0 ? (
                <EmptyPriorityZone />
              ) : (
                <SortableContext items={priorityEntries.map((dt) => dt.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {priorityEntries.map((dt, i) => {
                      const task = tasks.find((t) => t.id === dt.taskId)
                      if (!task) return null
                      const project = projects.find((p) => p.id === task.projectId)
                      const column = columns.find((c) => c.id === task.columnId)
                      return (
                        <PriorityItem key={dt.id} dailyTask={dt} rank={i + 1} task={task}
                          projectName={project?.name ?? 'Unknown'} columnName={column?.title ?? 'Unknown'} />
                      )
                    })}
                  </div>
                </SortableContext>
              )}
            </div>

            {/* Done drop zone — always visible when there are priority items */}
            {priorityEntries.length > 0 && <DoneDropZone isEmpty={completedEntries.length === 0} />}

            {/* Completed section */}
            {completedEntries.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Done · {completedEntries.length}</h3>
                {completedEntries.map((dt) => {
                  const task = tasks.find((t) => t.id === dt.taskId)
                  if (!task) return null
                  const project = projects.find((p) => p.id === task.projectId)
                  return <CompletedItem key={dt.id} dailyTask={dt} task={task} projectName={project?.name ?? 'Unknown'} />
                })}
              </div>
            )}

            {/* Habits section — only habits scheduled for this date */}
            {(() => {
              const todayHabits = habits.filter((h) => isHabitScheduledOn(h.recurrence, date))
              if (!todayHabits.length) return null
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Habits</h3>
                    <div className="flex gap-3 text-xs text-gray-400 pr-1">
                      <span>last 7d</span>
                      <span className="w-14 text-right">stats</span>
                    </div>
                  </div>
                  {todayHabits.map((habit) => (
                    <HabitRow key={habit.id} habit={habit} today={date} completions={habitCompletions} />
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Divider */}
          <div className="w-px bg-gray-200 flex-shrink-0" />

          {/* Right: task picker */}
          <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden">
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
              {projectsWithTasks.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No tasks found</p>}
              {projectsWithTasks.map(({ project, tasks: pts }) => (
                <div key={project.id}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1">{project.name}</p>
                  <div className="flex flex-col gap-0.5">
                    {pts.map((t) => <PickerTask key={t.id} task={t} alreadyAdded={assignedTaskIds.has(t.id)} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragTask && (
            <div className="rounded-lg px-3 py-2 shadow-xl text-sm font-semibold text-gray-800 rotate-1 opacity-95 border border-black/10 w-56"
              style={{ backgroundColor: activeDragTask.color }}>
              {activeDragTask.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
