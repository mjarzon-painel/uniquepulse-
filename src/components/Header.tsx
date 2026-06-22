import { Smartphone, WifiOff, LogOut } from 'lucide-react'
import { useStore } from '../store/useStore'

export default function Header() {
  const sessions = useStore((s) => s.sessions)
  const setPage = useStore((s) => s.setPage)
  const logout = useStore((s) => s.logout)
  const connectedCount = sessions.filter((s) => s.status === 'connected').length

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <img src="/logo-icon.png" alt="Unique" className="h-10 w-10 object-contain" />
        <div>
          <h1 className="text-base font-extrabold leading-none tracking-tight">
            Unique<span className="text-accent">Pulse</span>
          </h1>
          <p className="text-[10px] text-ink/50">Disparos WhatsApp — Unique Automóveis</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {connectedCount > 0 ? (
          <span className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {connectedCount} chip{connectedCount > 1 ? 's' : ''} conectado{connectedCount > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400">
            <WifiOff size={12} />
            Nenhum chip conectado
          </span>
        )}

        <button
          onClick={() => setPage('conexoes')}
          className="flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-black transition hover:brightness-110"
        >
          <Smartphone size={16} /> Gerenciar chips
        </button>

        <button
          onClick={logout}
          title="Sair"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink/70 transition hover:border-ink/30 hover:text-ink"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
