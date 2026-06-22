import { LayoutDashboard, Users, FileText, Send, History, Smartphone, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Page } from '../types'
import { isFilled } from '../utils/helpers'

const ITEMS: { id: Page; label: string; icon: typeof Users }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'conexoes', label: 'Conexões', icon: Smartphone },
  { id: 'contacts', label: 'Contatos', icon: Users },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'disparo', label: 'Disparo', icon: Send },
  { id: 'historico', label: 'Histórico', icon: History },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const page = useStore((s) => s.page)
  const setPage = useStore((s) => s.setPage)
  const templates = useStore((s) => s.templates)
  const contacts = useStore((s) => s.contacts)
  const sessions = useStore((s) => s.sessions)

  const filledCount = templates.filter(isFilled).length
  const connectedChips = sessions.filter((s) => s.status === 'connected').length

  const nav = (
    <>
      <nav className="flex flex-col gap-1">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-ink/70 hover:bg-white/5 hover:text-ink'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon size={18} />
                {label}
              </span>
              {id === 'templates' && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    filledCount === 3 ? 'bg-accent/20 text-accent' : 'bg-white/10 text-ink/60'
                  }`}
                >
                  {filledCount}/3 {filledCount === 3 ? '✅' : ''}
                </span>
              )}
              {id === 'contacts' && contacts.length > 0 && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-ink/60">
                  {contacts.length}
                </span>
              )}
              {id === 'conexoes' && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    connectedChips > 0 ? 'bg-accent/20 text-accent' : 'bg-white/10 text-ink/60'
                  }`}
                >
                  {connectedChips} 📱
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto rounded-card border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-300/80">
        <p className="font-semibold text-amber-300">⚠️ Envio real</p>
        As mensagens são enviadas de verdade pelo WhatsApp conectado. Respeite o intervalo para
        evitar bloqueio do número.
      </div>
    </>
  )

  return (
    <>
      {/* Desktop: sidebar fixa */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card/40 p-3 lg:flex">
        {nav}
      </aside>

      {/* Mobile: gaveta deslizante */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <aside className="absolute left-0 top-0 flex h-full w-64 max-w-[80%] flex-col border-r border-border bg-card p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-bold">
                Unique<span className="text-accent">Pulse</span>
              </span>
              <button onClick={onClose} className="text-ink/50 hover:text-ink">
                <X size={20} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  )
}
