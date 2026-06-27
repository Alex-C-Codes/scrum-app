import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Board } from './components/Board'
import { DailyView } from './components/DailyView'
import { CalendarView } from './components/CalendarView'
import { useScrumStore } from './store/useScrumStore'

function HamburgerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

export default function App() {
  const { isLoading, loadError, activeProjectId, currentView, projects, addProject, setActiveProject, loadData } = useScrumStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { loadData() }, [])

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
        <div className="text-center max-w-sm px-4">
          <p className="text-sm font-semibold text-red-500 mb-1">Could not connect to database</p>
          <p className="text-xs text-gray-400">{loadError}</p>
          <p className="text-xs text-gray-400 mt-2">Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly.</p>
        </div>
      </div>
    )
  }

  const project = projects.find((p) => p.id === activeProjectId)
  const viewTitle = currentView === 'daily' ? 'Daily Tasks' : currentView === 'calendar' ? 'Calendar' : project?.name ?? 'Board'

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <button
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200"
            onClick={() => setSidebarOpen(true)}
          >
            <HamburgerIcon />
          </button>
          <h1 className="font-semibold text-gray-800 flex-1 truncate">{viewTitle}</h1>
        </div>

        <main className="flex-1 flex flex-col overflow-hidden">
          {currentView === 'daily' ? (
            <DailyView />
          ) : currentView === 'calendar' ? (
            <CalendarView />
          ) : activeProjectId ? (
            <Board />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 p-6 text-center">
              <p>Select or create a project to get started</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
