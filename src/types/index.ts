export interface Task {
  id: string
  title: string
  description: string
  color: string
  columnId: string
  projectId: string
  order: number
  createdAt: number
}

export interface Column {
  id: string
  title: string
  projectId: string
  order: number
}

export interface Project {
  id: string
  name: string
  createdAt: number
}

export const TASK_COLORS = [
  '#fef08a', // yellow
  '#bbf7d0', // green
  '#bfdbfe', // blue
  '#fecaca', // red
  '#e9d5ff', // purple
  '#fed7aa', // orange
  '#f5f5f5', // white
]
