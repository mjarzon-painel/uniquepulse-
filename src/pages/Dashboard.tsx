import { useEffect, useState } from 'react'
import { Users, CheckCircle2, Clock, XCircle, Timer, Sparkles } from 'lucide-react'
import { useStore } from '../store/useStore'
import { templateForPosition, TEMPLATE_COLORS } from '../utils/helpers'

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="rounded-card border border-border bg-card p-5 transition hover:border-ink/20">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink/60">{label}</span>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="mt-2 text-3xl font-extrabold">{value}</div>
    </div>
  )
}

export default function Dashboard() {
  const contacts = useStore((s) => s.contacts)
  const dispatch = useStore((s) => s.dispatch)
  const nextSendAt = useStore((s) => s.nextSendAt)
  const queue = useStore((s) => s.queue)
  const queuePos = useStore((s) => s.queuePos)
  const templates = useStore((s) => s.templates)
  const setPage = useStore((s) => s.setPage)

  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const total = contacts.length
  const sent = contacts.filter((c) => c.status === 'sent').length
  const pending = contacts.filter((c) => c.status === 'pending').length
  const errors = contacts.filter((c) => c.status === 'error').length

  const remainingMs = nextSendAt ? Math.max(0, nextSendAt - Date.now()) : 0
  const mm = String(Math.floor(remainingMs / 60000)).padStart(2, '0')
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0')

  const nextTemplateIdx = templateForPosition(queuePos, templates)
  const nextContact = queue[queuePos] ? contacts.find((c) => c.id === queue[queuePos]) : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-ink/60">Visão geral da sua campanha de disparos.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Contatos importados" value={total} color="#3583ff" />
        <StatCard icon={CheckCircle2} label="Enviados (sessão)" value={sent} color="#e9b949" />
        <StatCard icon={Clock} label="Pendentes" value={pending} color="#f59e0b" />
        <StatCard icon={XCircle} label="Erros" value={errors} color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-ink/60">
            <Timer size={18} className="text-accent" />
            Próximo disparo
          </div>
          <div className="mt-3 font-mono text-5xl font-extrabold tracking-tight">
            {dispatch === 'running' ? `${mm}:${ss}` : '--:--'}
          </div>
          <p className="mt-2 text-sm text-ink/60">
            {dispatch === 'running' && nextContact ? (
              <>
                Próximo: <b className="text-ink">{nextContact.nome}</b>
              </>
            ) : dispatch === 'paused' ? (
              'Disparo pausado.'
            ) : (
              'Nenhum disparo agendado.'
            )}
          </p>
          <button
            onClick={() => setPage('disparo')}
            className="mt-4 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-semibold transition hover:border-ink/30"
          >
            Ir para Disparo →
          </button>
        </div>

        <div className="rounded-card border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-ink/60">
            <Sparkles size={18} className="text-accent" />
            Template do próximo envio
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-card text-lg font-extrabold text-white"
              style={{ background: TEMPLATE_COLORS[nextTemplateIdx] }}
            >
              T{nextTemplateIdx + 1}
            </span>
            <div>
              <div className="font-bold">{templates[nextTemplateIdx]?.name}</div>
              <div className="text-xs text-ink/50">
                {templates[nextTemplateIdx]?.text.slice(0, 60) || 'Sem texto'}
                {(templates[nextTemplateIdx]?.text.length ?? 0) > 60 ? '…' : ''}
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-ink/50">
            Os 3 templates são usados em rodízio sequencial (T1 → T2 → T3 → T1…).
          </p>
        </div>
      </div>
    </div>
  )
}
