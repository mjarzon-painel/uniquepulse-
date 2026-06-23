import { useEffect, useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import CompletionModal from './components/CompletionModal'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import Templates from './pages/Templates'
import Disparo from './pages/Disparo'
import Historico from './pages/Historico'
import Conexoes from './pages/Conexoes'
import Login from './pages/Login'
import { useStore } from './store/useStore'
import { getSocket, type ChipSession } from './utils/api'

export default function App() {
  const authed = useStore((s) => s.authed)
  const page = useStore((s) => s.page)
  const showCompletion = useStore((s) => s.showCompletion)
  const setSessions = useStore((s) => s.setSessions)
  const setAppState = useStore((s) => s.setAppState)
  const [navOpen, setNavOpen] = useState(false)

  // Close the mobile nav when the page changes.
  useEffect(() => {
    setNavOpen(false)
  }, [page])

  // Estado compartilhado e chips vêm do servidor, ao vivo (mesma coisa em todos os aparelhos).
  useEffect(() => {
    const socket = getSocket()
    const onSessions = (list: ChipSession[]) => setSessions(list)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onApp = (s: any) => setAppState(s)
    socket.on('sessions', onSessions)
    socket.on('app-state', onApp)
    return () => {
      socket.off('sessions', onSessions)
      socket.off('app-state', onApp)
    }
  }, [setSessions, setAppState])

  if (!authed) return <Login />

  return (
    <div className="flex h-screen flex-col">
      <Header onMenu={() => setNavOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {page === 'dashboard' && <Dashboard />}
          {page === 'contacts' && <Contacts />}
          {page === 'templates' && <Templates />}
          {page === 'disparo' && <Disparo />}
          {page === 'historico' && <Historico />}
          {page === 'conexoes' && <Conexoes />}
        </main>
      </div>
      {showCompletion && <CompletionModal />}
    </div>
  )
}
