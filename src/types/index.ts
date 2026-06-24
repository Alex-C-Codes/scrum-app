export interface Member {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  title: string
  description: string
  color: string
  columnId: string
  projectId: string
  order: number
  createdAt: number
  assigneeId: string | null
}

export const MEMBER_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

export interface Column {
  id: string
  title: string
  projectId: string
  order: number
}

export interface Project {
  id: string
  name: string
  groupId: string | null
  order: number
  createdAt: number
}

export interface ProjectGroup {
  id: string
  name: string
  order: number
  collapsed: boolean
}

export interface DailyTask {
  id: string
  taskId: string
  date: string   // 'YYYY-MM-DD'
  order: number
  completed: boolean
}

export type AppView = 'board' | 'daily'

export const TASK_COLORS = [
  '#fef08a', // yellow
  '#bbf7d0', // green
  '#bfdbfe', // blue
  '#fecaca', // red
  '#e9d5ff', // purple
  '#fed7aa', // orange
  '#f5f5f5', // white
]
