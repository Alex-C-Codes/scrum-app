import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Board } from './components/Board'
import { DailyView } from './components/DailyView'
import { useScrumStore } from './store/useScrumStore'

export default function App() {
  const { isLoading, loadError, activeProjectId, currentView, addProject, setActiveProject, loadData } = useScrumStore()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (isLoading) return
    const { projects } = useScrumStore.getState()
    if (projects.length === 0) {
      addProject('My First Project')
    } else if (!activeProjectId) {
      setActiveProject(projects[0].id)
    }
  }, [isLoading])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading your boards…</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold text-red-500 mb-1">Could not connect to database</p>
          <p className="text-xs text-gray-400">{loadError}</p>
          <p className="text-xs text-gray-400 mt-2">Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentView === 'daily' ? (
          <DailyView />
        ) : activeProjectId ? (
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
