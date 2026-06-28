export interface Member {
  id: string
  name: string
  color: string
}

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
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
  checklist: ChecklistItem[]
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

export type RecurrenceRule =
  | { type: 'daily' }
  | { type: 'weekly'; days: number[] }                          // 0=Sun … 6=Sat
  | { type: 'monthly_date'; dayOfMonth: number }                // e.g. 15th of each month
  | { type: 'monthly_weekday'; week: 1|2|3|4|5; day: number }  // e.g. first Friday

export function isHabitScheduledOn(r: RecurrenceRule, dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  switch (r.type) {
    case 'daily': return true
    case 'weekly': return r.days.length === 0 || r.days.includes(d.getDay())
    case 'monthly_date': return d.getDate() === r.dayOfMonth
    case 'monthly_weekday':
      return d.getDay() === r.day && Math.ceil(d.getDate() / 7) === r.week
  }
}

export function describeRecurrence(r: RecurrenceRule): string {
  const dayNames  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const weekOrd   = ['','First','Second','Third','Fourth','Fifth']
  const ord = (n: number) => {
    if (n % 100 >= 11 && n % 100 <= 13) return n + 'th'
    return n + (['th','st','nd','rd'][Math.min(n % 10, 3)] ?? 'th')
  }
  switch (r.type) {
    case 'daily': return 'Every day'
    case 'weekly': {
      if (!r.days.length || r.days.length === 7) return 'Every day'
      const s = [...r.days].sort()
      if (JSON.stringify(s) === JSON.stringify([1,2,3,4,5])) return 'Weekdays (Mon–Fri)'
      if (JSON.stringify(s) === JSON.stringify([0,6])) return 'Weekends'
      return s.map(d => dayNames[d]).join(', ')
    }
    case 'monthly_date': return `${ord(r.dayOfMonth)} of each month`
    case 'monthly_weekday': return `${weekOrd[r.week]} ${dayNames[r.day]} of each month`
  }
}

export interface Habit {
  id: string
  title: string
  projectId: string
  color: string
  recurrence: RecurrenceRule
  createdAt: number
}

export interface HabitCompletion {
  id: string
  habitId: string
  date: string // YYYY-MM-DD
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
