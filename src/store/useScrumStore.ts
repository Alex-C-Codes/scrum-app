import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { db } from '../lib/db'
import type { Task, Column, Project, ProjectGroup, DailyTask, AppView, Member, Habit, HabitCompletion } from '../types'
import { MEMBER_COLORS } from '../types'

interface ScrumState {
  groups: ProjectGroup[]
  projects: Project[]
  columns: Column[]
  tasks: Task[]
  dailyTasks: DailyTask[]
  members: Member[]
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  activeProjectId: string | null
  currentView: AppView
  dailyViewDate: string
  isLoading: boolean
  loadError: string | null

  loadData: () => Promise<void>
  setCurrentView: (view: AppView) => void
  setDailyViewDate: (date: string) => void

  // Daily tasks
  addToDaily: (taskId: string, date: string, insertAt?: number) => void
  removeFromDaily: (id: string) => void
  reorderDailyTasks: (date: string, orderedIds: string[]) => void
  toggleDailyTaskComplete: (id: string) => void
  rolloverDailyTasks: () => void

  // Groups
  addGroup: (name: string) => void
  renameGroup: (id: string, name: string) => void
  deleteGroup: (id: string) => void
  toggleGroupCollapsed: (id: string) => void
  reorderGroups: (orderedIds: string[]) => void

  // Projects
  addProject: (name: string, groupId?: string | null) => void
  renameProject: (id: string, name: string) => void
  moveProjectToGroup: (id: string, groupId: string | null) => void
  moveProject: (projectId: string, targetGroupId: string | null, overProjectId: string | null) => void
  deleteProject: (id: string) => void
  setActiveProject: (id: string) => void

  // Columns
  addColumn: (projectId: string, title: string) => void
  renameColumn: (id: string, title: string) => void
  deleteColumn: (id: string) => void
  reorderColumns: (projectId: string, orderedIds: string[]) => void

  // Members
  addMember: (name: string) => string
  deleteMember: (id: string) => void

  // Habits
  addHabit: (title: string, projectId: string, color: string, recurrence: Habit['recurrence']) => void
  updateHabit: (id: string, updates: Partial<Pick<Habit, 'title' | 'color' | 'recurrence'>>) => void
  deleteHabit: (id: string) => void
  toggleHabitCompletion: (habitId: string, date: string) => void

  // Tasks
  addTask: (columnId: string, projectId: string, title: string, description: string, color: string) => void
  updateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'color' | 'assigneeId'>>) => void
  deleteTask: (id: string) => void
  moveTask: (taskId: string, targetColumnId: string, newOrder: number) => void
  reorderTasks: (columnId: string, orderedIds: string[]) => void
}

const DEFAULT_COLUMN_TITLES = ['To Do', 'In Progress', 'Done']

export const useScrumStore = create<ScrumState>()((set, get) => ({
  groups: [],
  projects: [],
  columns: [],
  tasks: [],
  dailyTasks: [],
  members: [],
  habits: [],
  habitCompletions: [],
  activeProjectId: null,
  currentView: 'board',
  dailyViewDate: new Date().toLocaleDateString('en-CA'),
  isLoading: true,
  loadError: null,

  loadData: async () => {
    set({ isLoading: true, loadError: null })
    try {
      const data = await db.loadAll()
      set({ ...data, isLoading: false })
      if (!get().activeProjectId && data.projects.length > 0) {
        set({ activeProjectId: data.projects[0].id })
      }
      get().rolloverDailyTasks()
    } catch (err) {
      set({ isLoading: false, loadError: String(err) })
    }
  },

  setCurrentView: (view) => set({ currentView: view }),
  setDailyViewDate: (date) => set({ dailyViewDate: date }),

  // ── Daily tasks ───────────────────────────────────────────────────────────

  addToDaily: (taskId, date, insertAt) => {
    const s = get()
    if (s.dailyTasks.some((dt) => dt.taskId === taskId && dt.date === date)) return
    const dayTasks = s.dailyTasks.filter((dt) => dt.date === date).sort((a, b) => a.order - b.order)
    const pos = insertAt !== undefined ? Math.max(0, Math.min(insertAt, dayTasks.length)) : dayTasks.length
    const newEntry: DailyTask = { id: uuid(), taskId, date, order: pos, completed: false }
    dayTasks.splice(pos, 0, newEntry)
    const reordered = dayTasks.map((dt, i) => ({ ...dt, order: i }))
    set((s) => ({ dailyTasks: [...s.dailyTasks.filter((dt) => dt.date !== date), ...reordered] }))
    db.dailyTasks.upsertMany(reordered)
  },

  removeFromDaily: (id) => {
    const dt = get().dailyTasks.find((d) => d.id === id)
    if (!dt) return
    const remaining = get().dailyTasks
      .filter((d) => d.date === dt.date && d.id !== id)
      .sort((a, b) => a.order - b.order)
      .map((d, i) => ({ ...d, order: i }))
    set((s) => ({ dailyTasks: [...s.dailyTasks.filter((d) => d.date !== dt.date), ...remaining] }))
    db.dailyTasks.delete(id)
    if (remaining.length) db.dailyTasks.upsertMany(remaining)
  },

  reorderDailyTasks: (date, orderedIds) => {
    const reordered = get().dailyTasks
      .filter((dt) => dt.date === date)
      .map((dt) => ({ ...dt, order: orderedIds.indexOf(dt.id) }))
    set((s) => ({ dailyTasks: s.dailyTasks.map((dt) => dt.date === date ? { ...dt, order: orderedIds.indexOf(dt.id) } : dt) }))
    db.dailyTasks.upsertMany(reordered)
  },

  toggleDailyTaskComplete: (id) => {
    const s = get()
    const dt = s.dailyTasks.find((d) => d.id === id)
    if (!dt) return
    const nowComplete = !dt.completed
    const updated = { ...dt, completed: nowComplete }
    set((st) => ({ dailyTasks: st.dailyTasks.map((d) => d.id === id ? updated : d) }))
    db.dailyTasks.upsertMany([updated])

    if (nowComplete) {
      const task = s.tasks.find((t) => t.id === dt.taskId)
      if (task) {
        const doneCol = s.columns.find(
          (c) => c.projectId === task.projectId && c.title.toLowerCase() === 'done'
        )
        if (doneCol && task.columnId !== doneCol.id) {
          const insertAt = s.tasks.filter((t) => t.columnId === doneCol.id).length
          get().moveTask(task.id, doneCol.id, insertAt)
        }
      }
    }
  },

  // ── Members ───────────────────────────────────────────────────────────────

  addMember: (name) => {
    const s = get()
    const usedColors = new Set(s.members.map((m) => m.color))
    const color = MEMBER_COLORS.find((c) => !usedColors.has(c)) ?? MEMBER_COLORS[s.members.length % MEMBER_COLORS.length]
    const member: Member = { id: uuid(), name: name.trim(), color }
    set((st) => ({ members: [...st.members, member] }))
    db.members.insert(member)
    return member.id
  },

  deleteMember: (id) => {
    set((s) => ({
      members: s.members.filter((m) => m.id !== id),
      tasks: s.tasks.map((t) => t.assigneeId === id ? { ...t, assigneeId: null } : t),
    }))
    db.members.delete(id)
  },

  rolloverDailyTasks: () => {
    const s = get()
    const today = new Date().toLocaleDateString('en-CA')

    // Find the most recent past day that has pending (non-completed) entries
    const pastDaysWithPending = [...new Set(
      s.dailyTasks.filter((dt) => dt.date < today && !dt.completed).map((dt) => dt.date)
    )].sort()
    if (pastDaysWithPending.length === 0) return

    const sourceDay = pastDaysWithPending[pastDaysWithPending.length - 1]

    const pending = s.dailyTasks
      .filter((dt) => dt.date === sourceDay && !dt.completed)
      .sort((a, b) => a.order - b.order)

    const todayIds = new Set(s.dailyTasks.filter((dt) => dt.date === today).map((dt) => dt.taskId))
    const toAdd = pending.filter((dt) => !todayIds.has(dt.taskId))
    if (toAdd.length === 0) return

    const startOrder = s.dailyTasks.filter((dt) => dt.date === today).length
    const newEntries: DailyTask[] = toAdd.map((dt, i) => ({
      id: uuid(),
      taskId: dt.taskId,
      date: today,
      order: startOrder + i,
      completed: false,
    }))

    set((st) => ({ dailyTasks: [...st.dailyTasks, ...newEntries] }))
    db.dailyTasks.upsertMany(newEntries)
  },

  // ── Habits ────────────────────────────────────────────────────────────────

  addHabit: (title, projectId, color, recurrence) => {
    const habit: Habit = { id: uuid(), title, projectId, color, recurrence, createdAt: Date.now() }
    set((s) => ({ habits: [...s.habits, habit] }))
    db.habits.insert(habit)
  },

  updateHabit: (id, updates) => {
    set((s) => ({ habits: s.habits.map((h) => h.id === id ? { ...h, ...updates } : h) }))
    db.habits.update(id, updates)
  },

  deleteHabit: (id) => {
    set((s) => ({
      habits: s.habits.filter((h) => h.id !== id),
      habitCompletions: s.habitCompletions.filter((c) => c.habitId !== id),
    }))
    db.habits.delete(id)
  },

  toggleHabitCompletion: (habitId, date) => {
    const s = get()
    const existing = s.habitCompletions.find((c) => c.habitId === habitId && c.date === date)
    if (existing) {
      set((st) => ({ habitCompletions: st.habitCompletions.filter((c) => c.id !== existing.id) }))
      db.habitCompletions.delete(existing.id)
    } else {
      const completion: HabitCompletion = { id: uuid(), habitId, date }
      set((st) => ({ habitCompletions: [...st.habitCompletions, completion] }))
      db.habitCompletions.insert(completion)
    }
  },

  // ── Groups ────────────────────────────────────────────────────────────────

  addGroup: (name) => {
    const group: ProjectGroup = { id: uuid(), name, order: get().groups.length, collapsed: false }
    set((s) => ({ groups: [...s.groups, group] }))
    db.groups.insert(group)
  },

  renameGroup: (id, name) => {
    set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, name } : g)) }))
    db.groups.update(id, { name })
  },

  deleteGroup: (id) => {
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
      projects: s.projects.map((p) => (p.groupId === id ? { ...p, groupId: null } : p)),
    }))
    db.groups.delete(id)
  },

  toggleGroupCollapsed: (id) => {
    const group = get().groups.find((g) => g.id === id)
    if (!group) return
    const collapsed = !group.collapsed
    set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, collapsed } : g)) }))
    db.groups.update(id, { collapsed })
  },

  reorderGroups: (orderedIds) => {
    const reordered = get().groups.map((g) => ({ ...g, order: orderedIds.indexOf(g.id) }))
    set({ groups: reordered })
    db.groups.upsertMany(reordered)
  },

  // ── Projects ──────────────────────────────────────────────────────────────

  addProject: (name, groupId = null) => {
    const projectId = uuid()
    const order = get().projects.filter((p) => p.groupId === (groupId ?? null)).length
    const project: Project = { id: projectId, name, groupId: groupId ?? null, order, createdAt: Date.now() }
    const columns: Column[] = DEFAULT_COLUMN_TITLES.map((title, i) => ({ id: uuid(), title, projectId, order: i }))
    set((s) => ({
      projects: [...s.projects, project],
      columns: [...s.columns, ...columns],
      activeProjectId: s.activeProjectId ?? projectId,
    }))
    db.projects.insert(project)
    db.columns.insertMany(columns)
  },

  renameProject: (id, name) => {
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)) }))
    db.projects.update(id, { name })
  },

  moveProjectToGroup: (id, groupId) => {
    const order = get().projects.filter((p) => p.groupId === groupId && p.id !== id).length
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, groupId, order } : p)) }))
    db.projects.update(id, { group_id: groupId, order })
  },

  moveProject: (projectId, targetGroupId, overProjectId) => {
    const s = get()
    const dragged = s.projects.find((p) => p.id === projectId)
    if (!dragged) return
    const sourceGroupId = dragged.groupId

    const targetProjects = s.projects
      .filter((p) => p.groupId === targetGroupId && p.id !== projectId)
      .sort((a, b) => a.order - b.order)

    const overIndex = overProjectId ? targetProjects.findIndex((p) => p.id === overProjectId) : -1
    targetProjects.splice(overIndex === -1 ? targetProjects.length : overIndex, 0, { ...dragged, groupId: targetGroupId })
    const reorderedTarget = targetProjects.map((p, i) => ({ ...p, order: i }))

    const reorderedSource =
      sourceGroupId !== targetGroupId
        ? s.projects.filter((p) => p.groupId === sourceGroupId && p.id !== projectId).sort((a, b) => a.order - b.order).map((p, i) => ({ ...p, order: i }))
        : []

    const affectedIds = new Set([...reorderedTarget.map((p) => p.id), ...reorderedSource.map((p) => p.id)])
    set({
      projects: [
        ...s.projects.filter((p) => !affectedIds.has(p.id) && p.id !== projectId),
        ...reorderedTarget,
        ...reorderedSource,
      ],
    })
    db.projects.upsertMany([...reorderedTarget, ...reorderedSource])
  },

  deleteProject: (id) => {
    const remaining = get().projects.filter((p) => p.id !== id)
    set((s) => ({
      projects: remaining,
      columns: s.columns.filter((c) => c.projectId !== id),
      tasks: s.tasks.filter((t) => t.projectId !== id),
      activeProjectId: s.activeProjectId === id ? (remaining[0]?.id ?? null) : s.activeProjectId,
    }))
    db.projects.delete(id)
  },

  setActiveProject: (id) => set({ activeProjectId: id }),

  // ── Columns ───────────────────────────────────────────────────────────────

  addColumn: (projectId, title) => {
    const order = get().columns.filter((c) => c.projectId === projectId).length
    const column: Column = { id: uuid(), title, projectId, order }
    set((s) => ({ columns: [...s.columns, column] }))
    db.columns.insertMany([column])
  },

  renameColumn: (id, title) => {
    set((s) => ({ columns: s.columns.map((c) => (c.id === id ? { ...c, title } : c)) }))
    db.columns.update(id, { title })
  },

  deleteColumn: (id) => {
    set((s) => ({ columns: s.columns.filter((c) => c.id !== id), tasks: s.tasks.filter((t) => t.columnId !== id) }))
    db.columns.delete(id)
  },

  reorderColumns: (projectId, orderedIds) => {
    set((s) => ({ columns: s.columns.map((c) => (c.projectId === projectId ? { ...c, order: orderedIds.indexOf(c.id) } : c)) }))
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────

  addTask: (columnId, projectId, title, description, color) => {
    const order = get().tasks.filter((t) => t.columnId === columnId).length
    const task: Task = { id: uuid(), title, description, color, columnId, projectId, order, createdAt: Date.now(), assigneeId: null }
    set((s) => ({ tasks: [...s.tasks, task] }))
    db.tasks.insert(task)
  },

  updateTask: (id, updates) => {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) }))
    const { assigneeId, ...rest } = updates as { assigneeId?: string | null; [k: string]: unknown }
    const dbUpdates = { ...rest, ...(assigneeId !== undefined ? { assignee_id: assigneeId } : {}) }
    db.tasks.update(id, dbUpdates)
  },

  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    db.tasks.delete(id)
  },

  moveTask: (taskId, targetColumnId, newOrder) => {
    const s = get()
    const task = s.tasks.find((t) => t.id === taskId)
    if (!task) return
    const otherTasks = s.tasks.filter((t) => t.columnId === targetColumnId && t.id !== taskId).sort((a, b) => a.order - b.order)
    otherTasks.splice(newOrder, 0, { ...task, columnId: targetColumnId })
    const reordered = otherTasks.map((t, i) => ({ ...t, order: i }))
    set({ tasks: [...s.tasks.filter((t) => t.columnId !== targetColumnId && t.id !== taskId), ...reordered] })
    db.tasks.upsertMany(reordered)
  },

  reorderTasks: (columnId, orderedIds) => {
    const reordered = get().tasks.filter((t) => t.columnId === columnId).map((t) => ({ ...t, order: orderedIds.indexOf(t.id) }))
    set((s) => ({ tasks: s.tasks.map((t) => (t.columnId === columnId ? { ...t, order: orderedIds.indexOf(t.id) } : t)) }))
    db.tasks.upsertMany(reordered)
  },
}))
