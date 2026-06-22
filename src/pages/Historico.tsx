import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { Download } from 'lucide-react'
import { useStore } from '../store/useStore'
import { TEMPLATE_COLORS } from '../utils/helpers'

type Filter = 'all' | 'sent' | 'error' | 't0' | 't1' | 't2'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'sent', label: 'Enviados' },
  { id: 'error', label: 'Erros' },
  { id: 't0', label: 'Template 1' },
  { id: 't1', label: 'Template 2' },
  { id: 't2', label: 'Template 3' },
]

export default function Historico() {
  const history = useStore((s) => s.history)
  const [filter, setFilter] = useState<Filter>('all')

  const rows = useMemo(() => {
    return history.filter((h) => {
      if (filter === 'all') return true
      if (filter === 'sent') return h.status === 'sent'
      if (filter === 'error') return h.status === 'error'
      if (filter === 't0') return h.template === 0
      if (filter === 't1') return h.template === 1
      if (filter === 't2') return h.template === 2
      return true
    })
  }, [history, filter])

  function exportCSV() {
    const data = rows.map((h) => ({
      data_hora: h.datetime,
      nome: h.nome,
      telefone: h.telefone,
      template: `T${h.template + 1}`,
      chip: h.chip ?? '',
      status: h.status === 'sent' ? 'Enviado' : 'Erro',
      mensagem: h.preview,
    }))
    const csv = Papa.unparse(data)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'historico-disparos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Histórico</h2>
          <p className="text-sm text-ink/60">{history.length} registro(s) de envio.</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={rows.length === 0}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-black transition enabled:hover:brightness-110 disabled:opacity-40"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === f.id
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border bg-card text-ink/60 hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink/50">
              <th className="p-3">Data/Hora</th>
              <th className="p-3">Nome</th>
              <th className="p-3">Telefone</th>
              <th className="p-3">Template</th>
              <th className="p-3">Chip</th>
              <th className="p-3">Status</th>
              <th className="p-3">Prévia</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-ink/40">
                  Nenhum registro para este filtro.
                </td>
              </tr>
            )}
            {rows.map((h) => (
              <tr key={h.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]">
                <td className="whitespace-nowrap p-3 text-xs text-ink/60">{h.datetime}</td>
                <td className="p-3 font-medium">{h.nome}</td>
                <td className="p-3 font-mono text-xs text-ink/70">{h.telefone}</td>
                <td className="p-3">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-bold text-white"
                    style={{ background: TEMPLATE_COLORS[h.template] }}
                  >
                    T{h.template + 1}
                  </span>
                </td>
                <td className="p-3 text-xs text-ink/70">{h.chip ? `📱 ${h.chip}` : '—'}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      h.status === 'sent'
                        ? 'bg-accent/15 text-accent'
                        : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {h.status === 'sent' ? 'Enviado' : 'Erro'}
                  </span>
                </td>
                <td className="max-w-xs truncate p-3 text-xs text-ink/50" title={h.preview}>
                  {h.preview}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
