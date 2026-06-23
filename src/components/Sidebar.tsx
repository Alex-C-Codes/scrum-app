import { useState } from 'react'
import { useScrumStore } from '../store/useScrumStore'

export function Sidebar() {
  const { projects, activeProjectId, addProject, renameProject, deleteProject, setActiveProject } = useScrumStore()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const submit = () => {
    if (newName.trim()) {
      addProject(newName.trim())
      setNewName('')
      setAdding(false)
    }
  }

  const saveEdit = (id: string) => {
    if (editName.trim()) renameProject(id, editName.trim())
    setEditingId(null)
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 text-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-tight">ScrumBoard</h1>
        <p className="text-xs text-gray-400 mt-0.5">Manage your projects</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Projects</p>

        {projects.map((p) => (
          <div key={p.id} className="group relative">
            {editingId === p.id ? (
              <input
                autoFocus
                className="w-full bg-gray-700 text-white text-sm rounded px-3 py-2 outline-none"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => saveEdit(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit(p.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
              />
            ) : (
              <button
                className={`w-full text-left text-sm rounded px-3 py-2 transition-colors flex items-center justify-between ${
                  activeProjectId === p.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => setActiveProject(p.id)}
                onDoubleClick={() => { setEditingId(p.id); setEditName(p.name) }}
                title="Double-click to rename"
              >
                <span className="truncate">{p.name}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 ml-1 text-base leading-none"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete project "${p.name}"? This cannot be undone.`)) {
                      deleteProject(p.id)
                    }
                  }}
                >
                  ×
                </button>
              </button>
            )}
          </div>
        ))}

        {adding ? (
          <div className="flex flex-col gap-1 px-1 mt-1">
            <input
              autoFocus
              className="w-full bg-gray-700 text-white text-sm rounded px-3 py-2 outline-none placeholder-gray-500"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="Project name"
            />
            <div className="flex gap-1">
              <button className="text-xs px-2 py-1 rounded text-gray-400 hover:bg-gray-700" onClick={() => setAdding(false)}>Cancel</button>
              <button className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500" onClick={submit}>Create</button>
            </div>
          </div>
        ) : (
          <button
            className="w-full text-left text-sm text-gray-500 hover:text-gray-300 rounded px-3 py-2 hover:bg-gray-800 transition-colors mt-1"
            onClick={() => setAdding(true)}
          >
            + New project
          </button>
        )}
      </div>

      <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
        {projects.length} project{projects.length !== 1 ? 's' : ''}
      </div>
    </aside>
  )
}
