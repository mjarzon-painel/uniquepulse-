import { PartyPopper, History, RotateCcw } from 'lucide-react'
import { useStore } from '../store/useStore'
import { TEMPLATE_COLORS } from '../utils/helpers'

export default function CompletionModal() {
  const history = useStore((s) => s.history)
  const resetCampaign = useStore((s) => s.resetCampaign)
  const closeCompletion = useStore((s) => s.closeCompletion)
  const setPage = useStore((s) => s.setPage)

  // Summarize the most recent campaign run = entries newer than the previous reset.
  // For simplicity we summarize the full history snapshot since last reset.
  const sent = history.filter((h) => h.status === 'sent').length
  const errors = history.filter((h) => h.status === 'error').length

  const counts = [0, 1, 2].map(
    (i) => history.filter((h) => h.template === i).length,
  )
  const maxUsed = Math.max(...counts, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
          <PartyPopper size={32} className="text-accent" />
        </div>
        <h3 className="text-xl font-bold">Campanha concluída! 🎉</h3>
        <p className="mt-1 text-sm text-ink/60">Todos os contatos foram processados.</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-card border border-border bg-bg p-4">
            <div className="text-2xl font-bold text-accent">{sent}</div>
            <div className="text-xs text-ink/60">Enviados</div>
          </div>
          <div className="rounded-card border border-border bg-bg p-4">
            <div className="text-2xl font-bold text-red-400">{errors}</div>
            <div className="text-xs text-ink/60">Erros</div>
          </div>
        </div>

        <div className="mt-4 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
            Templates mais usados
          </p>
          <div className="space-y-2">
            {counts.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="w-8 rounded px-1.5 py-0.5 text-center text-xs font-bold text-white"
                  style={{ background: TEMPLATE_COLORS[i] }}
                >
                  T{i + 1}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: maxUsed ? `${(c / maxUsed) * 100}%` : '0%',
                      background: TEMPLATE_COLORS[i],
                    }}
                  />
                </div>
                <span className="w-6 text-right text-xs text-ink/60">{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => resetCampaign()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
            <RotateCcw size={16} /> Nova campanha
          </button>
          <button
            onClick={() => {
              closeCompletion()
              setPage('historico')
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-semibold transition hover:border-ink/30"
          >
            <History size={16} /> Ver histórico
          </button>
        </div>
      </div>
    </div>
  )
}
