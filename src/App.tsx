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
import { getSocket, fetchSessions, pushState, CLIENT_ID, type ChipSession } from './utils/api'

export default function App() {
  const authed = useStore((s) => s.authed)
  const page = useStore((s) => s.page)
  const tick = useStore((s) => s.tick)
  const showCompletion = useStore((s) => s.showCompletion)
  const setSessions = useStore((s) => s.setSessions)
  const applyMirror = useStore((s) => s.applyMirror)
  const [navOpen, setNavOpen] = useState(false)

  // Close the mobile nav when the page changes.
  useEffect(() => {
    setNavOpen(false)
  }, [page])

  // Single global 1s ticker drives the dispatch timer (no-op em modo visor).
  useEffect(() => {
    const id = setInterval(() => tick(), 1000)
    return () => clearInterval(id)
  }, [tick])

  // Sincroniza chips + espelhamento de estado (operador ↔ visores).
  useEffect(() => {
    fetchSessions().then((list) => list && setSessions(list))
    const socket = getSocket()
    const onSessions = (list: ChipSession[]) => setSessions(list)
    const onMirror = (payload: { clientId: string; state: Record<string, unknown> }) => {
      if (!payload || payload.clientId === CLIENT_ID) return // ignora o próprio estado
      applyMirror(payload.state)
    }
    socket.on('sessions', onSessions)
    socket.on('mirror-state', onMirror)
    return () => {
      socket.off('sessions', onSessions)
      socket.off('mirror-state', onMirror)
    }
  }, [setSessions, applyMirror])

  // Operador envia seu estado (debounced) para o servidor espelhar nos visores.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    const unsub = useStore.subscribe((s) => {
      if (s.isViewer) return // visor não envia
      clearTimeout(t)
      t = setTimeout(() => {
        const st = useStore.getState()
        pushState({
          contacts: st.contacts,
          templates: st.templates,
          settings: st.settings,
          dispatch: st.dispatch,
          queue: st.queue,
          queuePos: st.queuePos,
          chipCursor: st.chipCursor,
          dispatchChips: st.dispatchChips,
          nextSendAt: st.nextSendAt,
          currentIntervalMs: st.currentIntervalMs,
          log: st.log,
          history: st.history.slice(0, 200),
        })
      }, 400)
    })
    return () => {
      clearTimeout(t)
      unsub()
    }
  }, [])

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
