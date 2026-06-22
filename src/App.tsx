import { useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import CompletionModal from './components/CompletionModal'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import Templates from './pages/Templates'
import Disparo from './pages/Disparo'
import Historico from './pages/Historico'
import { useStore } from './store/useStore'
import { getSocket, fetchStatus, type WaState } from './utils/api'

export default function App() {
  const page = useStore((s) => s.page)
  const tick = useStore((s) => s.tick)
  const showCompletion = useStore((s) => s.showCompletion)
  const setConnected = useStore((s) => s.setConnected)

  // Single global 1s ticker drives the dispatch timer.
  useEffect(() => {
    const id = setInterval(() => tick(), 1000)
    return () => clearInterval(id)
  }, [tick])

  // Keep connection status in sync with the backend (real WhatsApp).
  useEffect(() => {
    fetchStatus().then((s) => s && setConnected(s.status === 'connected'))
    const socket = getSocket()
    const onState = (s: WaState) => setConnected(s.status === 'connected')
    socket.on('state', onState)
    return () => {
      socket.off('state', onState)
    }
  }, [setConnected])

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          {page === 'dashboard' && <Dashboard />}
          {page === 'contacts' && <Contacts />}
          {page === 'templates' && <Templates />}
          {page === 'disparo' && <Disparo />}
          {page === 'historico' && <Historico />}
        </main>
      </div>
      {showCompletion && <CompletionModal />}
    </div>
  )
}
