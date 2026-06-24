import { useMemo, useState } from 'react'
import { MessageSquare, Check, Trash2, Download, ExternalLink, Filter } from 'lucide-react'
import { useStore } from '../store/useStore'

const DAY_COLORS: Record<string, string> = {
  '26': '#3b82f6',
  '27': '#a855f7',
  '28': '#ec4899',
}

type DayFilter = 'todos' | '26' | '27' | '28' | 'pendentes'

export default function Respostas() {
  const replies = useStore((s) => s.replies)
  const clearReplies = useStore((s) => s.clearReplies)
  const markReplyHandled = useStore((s) => s.markReplyHandled)
  const [filter, setFilter] = useState<DayFilter>('todos')

  const counts = useMemo(() => {
    const c = { total: replies.length, d26: 0, d27: 0, d28: 0, outros: 0, pendentes: 0 }
    for (const r of replies) {
      if (r.day === '26') c.d26++
      else if (r.day === '27') c.d27++
      else if (r.day === '28') c.d28++
      else c.outros++
      if (!r.handled) c.pendentes++
    }
    return c
  }, [replies])

  const list = useMemo(() => {
    if (filter === 'todos') return replies
    if (filter === 'pendentes') return replies.filter((r) => !r.handled)
    return replies.filter((r) => r.day === filter)
  }, [replies, filter])

  function waLink(phone: string) {
    return `https://wa.me/${phone.replace(/\D/g, '')}`
  }

  function exportCsv() {
    const head = 'data,nome,telefone,dia,texto,tratado\n'
    const rows = replies
      .map((r) => {
        const cells = [r.datetime, r.name, r.from, r.day ?? '', r.text, r.handled ? 'sim' : 'não']
        return cells.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
      })
      .join('\n')
    const blob = new Blob([head + rows], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'respostas-uniquepulse.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const FILTERS: { id: DayFilter; label: string }[] = [
    { id: 'todos', label: `Todas (${counts.total})` },
    { id: 'pendentes', label: `Pendentes (${counts.pendentes})` },
    { id: '26', label: `Dia 26 (${counts.d26})` },
    { id: '27', label: `Dia 27 (${counts.d27})` },
    { id: '28', label: `Dia 28 (${counts.d28})` },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Respostas</h2>
          <p className="text-sm text-ink/60">
            Mensagens e cliques de botão que os clientes responderam (via API oficial).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            disabled={!replies.length}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold transition hover:border-accent disabled:opacity-40"
          >
            <Download size={15} /> CSV
          </button>
          <button
            onClick={() => {
              if (confirm('Limpar TODAS as respostas? Não dá pra desfazer.')) clearReplies()
            }}
            disabled={!replies.length}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
          >
            <Trash2 size={15} /> Limpar
          </button>
        </div>
      </div>

      {/* Resumo por dia */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['26', '27', '28'] as const).map((d) => (
          <div key={d} className="rounded-card border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: DAY_COLORS[d] }} />
              <span className="text-xs text-ink/50">Vou dia {d}</span>
            </div>
            <p className="mt-1 text-2xl font-extrabold">
              {d === '26' ? counts.d26 : d === '27' ? counts.d27 : counts.d28}
            </p>
          </div>
        ))}
        <div className="rounded-card border border-border bg-card p-4">
          <span className="text-xs text-ink/50">Outras respostas</span>
          <p className="mt-1 text-2xl font-extrabold">{counts.outros}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={15} className="text-ink/40" />
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              filter === f.id ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg text-ink/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border-2 border-dashed border-border bg-card/40 p-10 text-center">
          <MessageSquare size={32} className="mb-3 text-accent" />
          <p className="font-medium">Nenhuma resposta {filter !== 'todos' ? 'neste filtro' : 'ainda'}</p>
          <p className="mt-1 text-sm text-ink/50">
            As respostas aparecem aqui ao vivo assim que os clientes responderem.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <div
              key={r.id}
              className={`flex items-start gap-3 rounded-card border bg-card p-3.5 transition ${
                r.handled ? 'border-border opacity-60' : 'border-border'
              }`}
            >
              <button
                onClick={() => markReplyHandled(r.id)}
                title={r.handled ? 'Marcar como pendente' : 'Marcar como tratado'}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                  r.handled ? 'border-accent bg-accent text-black' : 'border-border text-transparent hover:border-accent'
                }`}
              >
                <Check size={14} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.name || r.from}</span>
                  {r.day && (
                    <span
                      className="rounded px-2 py-0.5 text-[11px] font-bold text-white"
                      style={{ background: DAY_COLORS[r.day] }}
                    >
                      Vou dia {r.day}
                    </span>
                  )}
                  <span className="text-xs text-ink/40">{r.datetime}</span>
                </div>
                <p className="mt-0.5 break-words text-sm text-ink/80">{r.text}</p>
                <div className="mt-1 text-xs text-ink/50">{r.from}</div>
              </div>

              <a
                href={waLink(r.from)}
                target="_blank"
                rel="noreferrer"
                title="Abrir conversa no WhatsApp"
                className="mt-0.5 flex shrink-0 items-center gap-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs font-semibold text-accent transition hover:border-accent"
              >
                <ExternalLink size={13} /> Abrir
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
