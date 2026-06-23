import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Board } from './components/Board'
import { useScrumStore } from './store/useScrumStore'

export default function App() {
  const { projects, activeProjectId, addProject, setActiveProject } = useScrumStore()

  useEffect(() => {
    const current = useScrumStore.getState()
    if (current.projects.length === 0) {
      addProject('My First Project')
    } else if (!current.activeProjectId) {
      setActiveProject(current.projects[0].id)
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeProjectId ? (
          <Board />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Select or create a project to get started</p>
          </div>
        )}
      </main>
    </div>
  )
}
