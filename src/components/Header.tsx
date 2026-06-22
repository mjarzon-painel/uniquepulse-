import { Smartphone, WifiOff, LogOut, Menu } from 'lucide-react'
import { useStore } from '../store/useStore'

export default function Header({ onMenu }: { onMenu: () => void }) {
  const sessions = useStore((s) => s.sessions)
  const setPage = useStore((s) => s.setPage)
  const logout = useStore((s) => s.logout)
  const connectedCount = sessions.filter((s) => s.status === 'connected').length

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-border bg-card/80 px-3 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onMenu}
          className="rounded-lg p-1.5 text-ink/70 transition hover:bg-white/5 hover:text-ink lg:hidden"
          aria-label="Menu"
        >
          <Menu size={22} />
        </button>
        <img src="/logo-icon.png" alt="Unique" className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10" />
        <div className="min-w-0">
          <h1 className="truncate text-base font-extrabold leading-none tracking-tight">
            Unique<span className="text-accent">Pulse</span>
          </h1>
          <p className="hidden text-[10px] text-ink/50 sm:block">Disparos WhatsApp — Unique Automóveis</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {connectedCount > 0 ? (
          <span className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent sm:px-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="hidden sm:inline">
              {connectedCount} chip{connectedCount > 1 ? 's' : ''} conectado{connectedCount > 1 ? 's' : ''}
            </span>
            <span className="sm:hidden">{connectedCount} 📱</span>
          </span>
        ) : (
          <span className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-400 sm:px-3">
            <WifiOff size={12} />
            <span className="hidden sm:inline">Nenhum chip conectado</span>
            <span className="sm:hidden">0 📱</span>
          </span>
        )}

        <button
          onClick={() => setPage('conexoes')}
          className="flex items-center gap-2 rounded-lg bg-accent px-2.5 py-2 text-sm font-semibold text-black transition hover:brightness-110 sm:px-3.5"
        >
          <Smartphone size={16} />
          <span className="hidden sm:inline">Gerenciar chips</span>
        </button>

        <button
          onClick={logout}
          title="Sair"
          className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm font-medium text-ink/70 transition hover:border-ink/30 hover:text-ink"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
