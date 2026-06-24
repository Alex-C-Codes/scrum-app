import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById('root')!)

try {
  const { default: App } = await import('./App.tsx')
  root.render(<StrictMode><App /></StrictMode>)
} catch (err) {
  root.render(
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', background: '#f9fafb' }}>
      <div style={{ maxWidth: 480, padding: 24, background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.1)' }}>
        <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: 8 }}>Configuration error</p>
        <pre style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', margin: 0 }}>{String(err)}</pre>
      </div>
    </div>
  )
}
