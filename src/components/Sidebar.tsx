import { LayoutDashboard, Users, FileText, Send, History } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Page } from '../types'
import { isFilled } from '../utils/helpers'

const ITEMS: { id: Page; label: string; icon: typeof Users }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'contacts', label: 'Contatos', icon: Users },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'disparo', label: 'Disparo', icon: Send },
  { id: 'historico', label: 'Histórico', icon: History },
]

export default function Sidebar() {
  const page = useStore((s) => s.page)
  const setPage = useStore((s) => s.setPage)
  const templates = useStore((s) => s.templates)
  const contacts = useStore((s) => s.contacts)

  const filledCount = templates.filter(isFilled).length

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card/40 p-3">
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
                    filledCount === 3
                      ? 'bg-accent/20 text-accent'
                      : 'bg-white/10 text-ink/60'
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
            </button>
          )
        })}
      </nav>

      <div className="mt-auto rounded-card border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-300/80">
        <p className="font-semibold text-amber-300">⚠️ Envio real</p>
        As mensagens são enviadas de verdade pelo WhatsApp conectado. Respeite o intervalo para
        evitar bloqueio do número.
      </div>
    </aside>
  )
}
