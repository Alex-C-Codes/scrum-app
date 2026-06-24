import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { db } from '../lib/db'
import type { Task, Column, Project, ProjectGroup } from '../types'

interface ScrumState {
  groups: ProjectGroup[]
  projects: Project[]
  columns: Column[]
  tasks: Task[]
  activeProjectId: string | null
  isLoading: boolean
  loadError: string | null

  loadData: () => Promise<void>

  // Groups
  addGroup: (name: string) => void
  renameGroup: (id: string, name: string) => void
  deleteGroup: (id: string) => void
  toggleGroupCollapsed: (id: string) => void

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

  // Tasks
  addTask: (columnId: string, projectId: string, title: string, description: string, color: string) => void
  updateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'color'>>) => void
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
  activeProjectId: null,
  isLoading: true,
  loadError: null,

  loadData: async () => {
    set({ isLoading: true, loadError: null })
    try {
      const data = await db.loadAll()
      set({ ...data, isLoading: false })
    } catch (err) {
      set({ isLoading: false, loadError: String(err) })
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
    const task: Task = { id: uuid(), title, description, color, columnId, projectId, order, createdAt: Date.now() }
    set((s) => ({ tasks: [...s.tasks, task] }))
    db.tasks.insert(task)
  },

  updateTask: (id, updates) => {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) }))
    db.tasks.update(id, updates)
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
