import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useScrumStore } from '../store/useScrumStore'
import type { Project } from '../types'

// ─── Icons ───────────────────────────────────────────────────────────────────

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${collapsed ? '-rotate-90' : ''}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}
function GripIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/>
      <circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>
      <circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/>
    </svg>
  )
}

// ─── Sortable project row ─────────────────────────────────────────────────────

function SortableProjectRow({ project, isActive }: { project: Project; isActive: boolean }) {
  const { groups, renameProject, moveProjectToGroup, deleteProject, setActiveProject, setCurrentView } = useScrumStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    data: { type: 'project', groupId: project.groupId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  const saveName = () => {
    if (name.trim()) renameProject(project.id, name.trim())
    else setName(project.name)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1 pl-4 pr-2 py-1" ref={setNodeRef} style={style}>
        <input
          autoFocus
          className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5 outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveName()
            if (e.key === 'Escape') { setName(project.name); setEditing(false) }
          }}
        />
        <select
          className="w-full bg-gray-700 text-gray-300 text-xs rounded px-2 py-1.5 outline-none"
          value={project.groupId ?? ''}
          onChange={(e) => moveProjectToGroup(project.id, e.target.value || null)}
        >
          <option value="">No group</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div className="flex gap-1">
          <button className="text-xs px-2 py-0.5 rounded text-gray-400 hover:bg-gray-700" onClick={() => { setName(project.name); setEditing(false) }}>Cancel</button>
          <button className="text-xs px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-500" onMouseDown={saveName}>Save</button>
        </div>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className="group/row flex items-center">
      {/* drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="pl-1 pr-0.5 py-2 text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing opacity-0 group-hover/row:opacity-100"
      >
        <GripIcon />
      </span>
      <button
        className={`flex-1 min-w-0 text-left text-xs rounded px-2 py-2 transition-colors flex items-center gap-1 ${
          isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'
        }`}
        onClick={() => { setActiveProject(project.id); setCurrentView('board') }}
      >
        <span className="truncate flex-1">{project.name}</span>
        <span className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100">
          <span className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-white" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setEditing(true) }} title="Rename / move to group">
            <PencilIcon />
          </span>
          <span className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${project.name}"?`)) deleteProject(project.id) }} title="Delete">
            <TrashIcon />
          </span>
        </span>
      </button>
    </div>
  )
}

// Lightweight preview shown in DragOverlay
function ProjectDragPreview({ project }: { project: Project }) {
  return (
    <div className="flex items-center bg-gray-700 text-gray-200 text-xs rounded px-3 py-2 shadow-xl w-48 opacity-95">
      <span className="mr-1.5 text-gray-500"><GripIcon /></span>
      <span className="truncate">{project.name}</span>
    </div>
  )
}

// ─── Group droppable container ────────────────────────────────────────────────

function GroupDropZone({ groupId, children, empty }: { groupId: string | null; children: React.ReactNode; empty: boolean }) {
  const id = groupId ?? 'ungrouped'
  const { setNodeRef, isOver } = useDroppable({ id: `group-drop:${id}`, data: { type: 'group-container', groupId } })
  return (
    <div ref={setNodeRef} className={`flex flex-col gap-0.5 min-h-6 rounded transition-colors ${isOver ? 'bg-indigo-900/30' : ''} ${empty && isOver ? 'py-1' : ''}`}>
      {children}
      {empty && isOver && (
        <div className="mx-2 border border-dashed border-indigo-500/50 rounded h-7 text-xs text-indigo-400 flex items-center justify-center">Drop here</div>
      )}
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { groups, projects, activeProjectId, currentView, setCurrentView, addProject, addGroup, renameGroup, deleteGroup, toggleGroupCollapsed, moveProject } = useScrumStore()

  const [addingProject, setAddingProject] = useState<string | 'ungrouped' | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const onDragStart = ({ active }: DragStartEvent) => setDraggedProjectId(active.id as string)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggedProjectId(null)
    if (!over) return

    const projectId = active.id as string
    const overType = over.data.current?.type

    if (overType === 'project') {
      const overProject = projects.find((p) => p.id === over.id)
      moveProject(projectId, overProject?.groupId ?? null, over.id as string)
    } else if (overType === 'group-container') {
      moveProject(projectId, over.data.current?.groupId ?? null, null)
    }
  }

  const submitProject = (groupId: string | null) => {
    if (newProjectName.trim()) {
      addProject(newProjectName.trim(), groupId)
      setNewProjectName('')
      setAddingProject(null)
    }
  }

  const saveGroupName = (id: string) => {
    if (editGroupName.trim()) renameGroup(id, editGroupName.trim())
    setEditingGroupId(null)
  }

  const sortedGroups = [...groups].sort((a, b) => a.order - b.order)
  const ungrouped = [...projects.filter((p) => !p.groupId)].sort((a, b) => a.order - b.order)
  const draggedProject = draggedProjectId ? projects.find((p) => p.id === draggedProjectId) : null

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 text-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-tight">ScrumBoard</h1>
        <p className="text-xs text-gray-400 mt-0.5">Manage your projects</p>
      </div>

      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-0.5">
        {/* Today shortcut */}
        <button
          className={`mx-2 mb-2 flex items-center gap-2 text-sm rounded-lg px-3 py-2 transition-colors ${
            currentView === 'daily' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setCurrentView('daily')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Daily Tasks
        </button>
        <div className="mx-2 mb-1 border-t border-gray-800" />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>

          {/* Named groups */}
          {sortedGroups.map((group) => {
            const groupProjects = [...projects.filter((p) => p.groupId === group.id)].sort((a, b) => a.order - b.order)
            return (
              <div key={group.id}>
                <div className="group/grp flex items-center gap-1 px-2 py-1.5">
                  <button className="flex items-center gap-1 flex-1 min-w-0" onClick={() => toggleGroupCollapsed(group.id)}>
                    <span className="text-gray-500"><ChevronIcon collapsed={group.collapsed} /></span>
                    {editingGroupId === group.id ? (
                      <input
                        autoFocus
                        className="flex-1 bg-gray-700 text-white text-xs rounded px-1.5 py-0.5 outline-none"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        onBlur={() => saveGroupName(group.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveGroupName(group.id); if (e.key === 'Escape') setEditingGroupId(null) }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">{group.name}</span>
                    )}
                    <span className="text-xs text-gray-600 ml-auto">{groupProjects.length}</span>
                  </button>
                  <span className="flex gap-0.5 opacity-0 group-hover/grp:opacity-100">
                    <span className="p-0.5 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700 cursor-pointer" onClick={() => { setEditingGroupId(group.id); setEditGroupName(group.name) }} title="Rename"><PencilIcon /></span>
                    <span className="p-0.5 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 cursor-pointer" onClick={() => { if (confirm(`Delete group "${group.name}"? Projects will become ungrouped.`)) deleteGroup(group.id) }} title="Delete"><TrashIcon /></span>
                  </span>
                </div>

                {!group.collapsed && (
                  <SortableContext items={groupProjects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                    <GroupDropZone groupId={group.id} empty={groupProjects.length === 0}>
                      {groupProjects.map((p) => (
                        <SortableProjectRow key={p.id} project={p} isActive={activeProjectId === p.id} />
                      ))}
                    </GroupDropZone>
                  </SortableContext>
                )}

                {!group.collapsed && (
                  addingProject === group.id ? (
                    <div className="flex flex-col gap-1 pl-5 pr-2 py-1">
                      <input autoFocus className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5 outline-none placeholder-gray-500" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitProject(group.id); if (e.key === 'Escape') setAddingProject(null) }} placeholder="Project name" />
                      <div className="flex gap-1">
                        <button className="text-xs px-2 py-0.5 rounded text-gray-400 hover:bg-gray-700" onClick={() => setAddingProject(null)}>Cancel</button>
                        <button className="text-xs px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-500" onClick={() => submitProject(group.id)}>Add</button>
                      </div>
                    </div>
                  ) : (
                    <button className="text-xs text-gray-600 hover:text-gray-400 pl-6 pr-2 py-1 text-left hover:bg-gray-800 rounded w-full" onClick={() => { setAddingProject(group.id); setNewProjectName('') }}>+ Add project</button>
                  )
                )}
              </div>
            )
          })}

          {/* Ungrouped */}
          {(ungrouped.length > 0 || groups.length === 0) && (
            <div>
              {groups.length > 0 && (
                <div className="px-2 py-1.5">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Ungrouped</span>
                </div>
              )}
              <SortableContext items={ungrouped.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <GroupDropZone groupId={null} empty={ungrouped.length === 0}>
                  {ungrouped.map((p) => (
                    <SortableProjectRow key={p.id} project={p} isActive={activeProjectId === p.id} />
                  ))}
                </GroupDropZone>
              </SortableContext>
            </div>
          )}

          <DragOverlay dropAnimation={null}>
            {draggedProject && <ProjectDragPreview project={draggedProject} />}
          </DragOverlay>
        </DndContext>

        {/* Add project (ungrouped) */}
        <div className="mt-1">
          {addingProject === 'ungrouped' ? (
            <div className="flex flex-col gap-1 px-2 py-1">
              <input autoFocus className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5 outline-none placeholder-gray-500" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitProject(null); if (e.key === 'Escape') setAddingProject(null) }} placeholder="Project name" />
              <div className="flex gap-1">
                <button className="text-xs px-2 py-0.5 rounded text-gray-400 hover:bg-gray-700" onClick={() => setAddingProject(null)}>Cancel</button>
                <button className="text-xs px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-500" onClick={() => submitProject(null)}>Add</button>
              </div>
            </div>
          ) : (
            <button className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 text-left hover:bg-gray-800 rounded mx-1 w-full" onClick={() => { setAddingProject('ungrouped'); setNewProjectName('') }}>+ New project</button>
          )}
        </div>

        {/* Add group */}
        <div className="border-t border-gray-800 mt-1 pt-2">
          {addingGroup ? (
            <div className="flex flex-col gap-1 px-2 py-1">
              <input autoFocus className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5 outline-none placeholder-gray-500" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newGroupName.trim()) { addGroup(newGroupName.trim()); setNewGroupName(''); setAddingGroup(false) } if (e.key === 'Escape') setAddingGroup(false) }} placeholder="Group name" />
              <div className="flex gap-1">
                <button className="text-xs px-2 py-0.5 rounded text-gray-400 hover:bg-gray-700" onClick={() => setAddingGroup(false)}>Cancel</button>
                <button className="text-xs px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-500" onClick={() => { if (newGroupName.trim()) { addGroup(newGroupName.trim()); setNewGroupName(''); setAddingGroup(false) } }}>Create</button>
              </div>
            </div>
          ) : (
            <button className="text-xs text-gray-600 hover:text-gray-400 px-3 py-1.5 text-left hover:bg-gray-800 rounded mx-1 w-full" onClick={() => setAddingGroup(true)}>+ New group</button>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
        {groups.length} group{groups.length !== 1 ? 's' : ''} · {projects.length} project{projects.length !== 1 ? 's' : ''}
      </div>
    </aside>
  )
}
