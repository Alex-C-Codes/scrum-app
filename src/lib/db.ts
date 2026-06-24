import { supabase } from './supabase'
import type { Task, Column, Project, ProjectGroup, DailyTask } from '../types'

// Map DB snake_case rows → TS camelCase types
const toGroup     = (r: Record<string, unknown>): ProjectGroup => ({ id: r.id as string, name: r.name as string, order: r.order as number, collapsed: r.collapsed as boolean })
const toProject   = (r: Record<string, unknown>): Project      => ({ id: r.id as string, name: r.name as string, groupId: r.group_id as string | null, order: r.order as number, createdAt: new Date(r.created_at as string).getTime() })
const toColumn    = (r: Record<string, unknown>): Column       => ({ id: r.id as string, title: r.title as string, projectId: r.project_id as string, order: r.order as number })
const toTask      = (r: Record<string, unknown>): Task         => ({ id: r.id as string, title: r.title as string, description: r.description as string, color: r.color as string, columnId: r.column_id as string, projectId: r.project_id as string, order: r.order as number, createdAt: new Date(r.created_at as string).getTime() })
const toDailyTask = (r: Record<string, unknown>): DailyTask    => ({ id: r.id as string, taskId: r.task_id as string, date: r.date as string, order: r.order as number, completed: (r.completed as boolean) ?? false })

const fire = (p: PromiseLike<{ error: unknown }>) =>
  Promise.resolve(p).then(({ error }) => { if (error) console.error(error) })

export const db = {
  loadAll: async () => {
    const settled = await Promise.allSettled([
      supabase.from('project_groups').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('board_columns').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('daily_tasks').select('*'),
    ])
    const [g, p, c, t, dt] = settled.map((r) => {
      if (r.status === 'rejected') { console.error('DB query failed:', r.reason); return { data: null } }
      if (r.value.error) console.error('DB query error:', r.value.error.message)
      return r.value
    })
    return {
      groups:     (g.data  ?? []).map(toGroup),
      projects:   (p.data  ?? []).map(toProject),
      columns:    (c.data  ?? []).map(toColumn),
      tasks:      (t.data  ?? []).map(toTask),
      dailyTasks: (dt.data ?? []).map(toDailyTask),
    }
  },

  groups: {
    insert: (g: ProjectGroup) => fire(supabase.from('project_groups').insert({ id: g.id, name: g.name, order: g.order, collapsed: g.collapsed })),
    update: (id: string, data: object)  => fire(supabase.from('project_groups').update(data).eq('id', id)),
    delete: (id: string)               => fire(supabase.from('project_groups').delete().eq('id', id)),
  },

  projects: {
    insert:     (p: Project)   => fire(supabase.from('projects').insert({ id: p.id, name: p.name, group_id: p.groupId, order: p.order })),
    update:     (id: string, data: object) => fire(supabase.from('projects').update(data).eq('id', id)),
    upsertMany: (ps: Project[]) => fire(supabase.from('projects').upsert(ps.map((p) => ({ id: p.id, name: p.name, group_id: p.groupId, order: p.order })))),
    delete:     (id: string)   => fire(supabase.from('projects').delete().eq('id', id)),
  },

  columns: {
    insertMany: (cols: Column[]) => fire(supabase.from('board_columns').insert(cols.map((c) => ({ id: c.id, title: c.title, project_id: c.projectId, order: c.order })))),
    update:     (id: string, data: object) => fire(supabase.from('board_columns').update(data).eq('id', id)),
    delete:     (id: string)   => fire(supabase.from('board_columns').delete().eq('id', id)),
  },

  tasks: {
    insert:     (t: Task)      => fire(supabase.from('tasks').insert({ id: t.id, title: t.title, description: t.description, color: t.color, column_id: t.columnId, project_id: t.projectId, order: t.order })),
    update:     (id: string, data: object) => fire(supabase.from('tasks').update(data).eq('id', id)),
    upsertMany: (ts: Task[])   => fire(supabase.from('tasks').upsert(ts.map((t) => ({ id: t.id, title: t.title, description: t.description, color: t.color, column_id: t.columnId, project_id: t.projectId, order: t.order })))),
    delete:     (id: string)   => fire(supabase.from('tasks').delete().eq('id', id)),
  },

  dailyTasks: {
    upsertMany: (dts: DailyTask[]) => fire(supabase.from('daily_tasks').upsert(dts.map((d) => ({ id: d.id, task_id: d.taskId, date: d.date, order: d.order, completed: d.completed })))),
    delete:     (id: string)       => fire(supabase.from('daily_tasks').delete().eq('id', id)),
  },
}
