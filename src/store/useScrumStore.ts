import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { Task, Column, Project } from '../types'

interface ScrumState {
  projects: Project[]
  columns: Column[]
  tasks: Task[]
  activeProjectId: string | null

  // Projects
  addProject: (name: string) => void
  renameProject: (id: string, name: string) => void
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

export const useScrumStore = create<ScrumState>()(
  persist(
    (set, get) => ({
      projects: [],
      columns: [],
      tasks: [],
      activeProjectId: null,

      addProject: (name) => {
        const projectId = uuid()
        const columns: Column[] = DEFAULT_COLUMN_TITLES.map((title, i) => ({
          id: uuid(),
          title,
          projectId,
          order: i,
        }))
        set((s) => ({
          projects: [...s.projects, { id: projectId, name, createdAt: Date.now() }],
          columns: [...s.columns, ...columns],
          activeProjectId: s.activeProjectId ?? projectId,
        }))
      },

      renameProject: (id, name) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)) })),

      deleteProject: (id) =>
        set((s) => {
          const remaining = s.projects.filter((p) => p.id !== id)
          return {
            projects: remaining,
            columns: s.columns.filter((c) => c.projectId !== id),
            tasks: s.tasks.filter((t) => t.projectId !== id),
            activeProjectId:
              s.activeProjectId === id ? (remaining[0]?.id ?? null) : s.activeProjectId,
          }
        }),

      setActiveProject: (id) => set({ activeProjectId: id }),

      addColumn: (projectId, title) => {
        const cols = get().columns.filter((c) => c.projectId === projectId)
        set((s) => ({
          columns: [
            ...s.columns,
            { id: uuid(), title, projectId, order: cols.length },
          ],
        }))
      },

      renameColumn: (id, title) =>
        set((s) => ({ columns: s.columns.map((c) => (c.id === id ? { ...c, title } : c)) })),

      deleteColumn: (id) =>
        set((s) => ({
          columns: s.columns.filter((c) => c.id !== id),
          tasks: s.tasks.filter((t) => t.columnId !== id),
        })),

      reorderColumns: (projectId, orderedIds) =>
        set((s) => ({
          columns: s.columns.map((c) =>
            c.projectId === projectId ? { ...c, order: orderedIds.indexOf(c.id) } : c
          ),
        })),

      addTask: (columnId, projectId, title, description, color) => {
        const colTasks = get().tasks.filter((t) => t.columnId === columnId)
        set((s) => ({
          tasks: [
            ...s.tasks,
            {
              id: uuid(),
              title,
              description,
              color,
              columnId,
              projectId,
              order: colTasks.length,
              createdAt: Date.now(),
            },
          ],
        }))
      },

      updateTask: (id, updates) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),

      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      moveTask: (taskId, targetColumnId, newOrder) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === taskId)
          if (!task) return s
          const otherTasks = s.tasks
            .filter((t) => t.columnId === targetColumnId && t.id !== taskId)
            .sort((a, b) => a.order - b.order)
          otherTasks.splice(newOrder, 0, { ...task, columnId: targetColumnId })
          const reordered = otherTasks.map((t, i) => ({ ...t, order: i }))
          return {
            tasks: [
              ...s.tasks.filter((t) => t.columnId !== targetColumnId && t.id !== taskId),
              ...reordered,
            ],
          }
        }),

      reorderTasks: (columnId, orderedIds) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.columnId === columnId ? { ...t, order: orderedIds.indexOf(t.id) } : t
          ),
        })),
    }),
    { name: 'scrum-store' }
  )
)
