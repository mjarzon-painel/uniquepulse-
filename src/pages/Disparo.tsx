import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Square, Clock3, Shuffle, ListOrdered } from 'lucide-react'
import { useStore } from '../store/useStore'
import {
  isWithinBusinessHours,
  templateForPosition,
  TEMPLATE_COLORS,
} from '../utils/helpers'

function CountdownRing({ progress, mm, ss }: { progress: number; mm: string; ss: string }) {
  const r = 70
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 160 160" className="h-44 w-44">
      <circle cx="80" cy="80" r={r} fill="none" stroke="#5c4a22" strokeWidth="10" />
      <circle
        cx="80"
        cy="80"
        r={r}
        fill="none"
        stroke="#e9b949"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        transform="rotate(-90 80 80)"
        style={{ transition: 'stroke-dashoffset 0.5s linear' }}
      />
      <text x="80" y="80" textAnchor="middle" className="fill-ink font-mono" fontSize="30" fontWeight="800">
        {mm}:{ss}
      </text>
      <text x="80" y="102" textAnchor="middle" className="fill-[#94a3b8]" fontSize="11">
        restante
      </text>
    </svg>
  )
}

export default function Disparo() {
  const connected = useStore((s) => s.connected)
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const dispatch = useStore((s) => s.dispatch)
  const start = useStore((s) => s.start)
  const pause = useStore((s) => s.pause)
  const stop = useStore((s) => s.stop)
  const log = useStore((s) => s.log)
  const nextSendAt = useStore((s) => s.nextSendAt)
  const currentIntervalMs = useStore((s) => s.currentIntervalMs)
  const queue = useStore((s) => s.queue)
  const queuePos = useStore((s) => s.queuePos)
  const contacts = useStore((s) => s.contacts)
  const templates = useStore((s) => s.templates)

  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [])

  const logEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  const cycleMs = currentIntervalMs || settings.intervalMin * 60000
  const remainingMs = nextSendAt ? Math.max(0, nextSendAt - Date.now()) : 0
  const mm = String(Math.floor(remainingMs / 60000)).padStart(2, '0')
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0')
  const progress = cycleMs ? 1 - remainingMs / cycleMs : 0

  const nextTemplateIdx = templateForPosition(queuePos, templates)
  const nextContact = queue[queuePos] ? contacts.find((c) => c.id === queue[queuePos]) : null
  const outsideHours = settings.businessHours && !isWithinBusinessHours()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Disparo</h2>
        <p className="text-sm text-ink/60">Configure e controle o envio automático em rodízio.</p>
      </div>

      {!connected && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          ⚠️ WhatsApp desconectado. Conecte no topo da página para liberar os controles.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Settings */}
        <div className="space-y-5 rounded-card border border-border bg-card p-5 lg:col-span-2">
          <h3 className="font-semibold">Configurações</h3>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-ink/70">
                <Clock3 size={15} /> Intervalo variável entre mensagens
              </label>
              <span className="rounded-md bg-bg px-2 py-1 text-sm font-bold text-accent">
                {settings.intervalMin}–{settings.intervalMax} min
              </span>
            </div>

            {/* Mínimo */}
            <div className="mb-1 flex items-center justify-between text-xs text-ink/50">
              <span>Mínimo</span>
              <span className="font-semibold text-ink/80">{settings.intervalMin} min</span>
            </div>
            <input
              type="range"
              min={1}
              max={60}
              value={settings.intervalMin}
              onChange={(e) => {
                const v = Number(e.target.value)
                updateSettings({
                  intervalMin: v,
                  intervalMax: Math.max(v, settings.intervalMax),
                })
              }}
              className="w-full"
            />

            {/* Máximo */}
            <div className="mb-1 mt-3 flex items-center justify-between text-xs text-ink/50">
              <span>Máximo</span>
              <span className="font-semibold text-ink/80">{settings.intervalMax} min</span>
            </div>
            <input
              type="range"
              min={1}
              max={60}
              value={settings.intervalMax}
              onChange={(e) => {
                const v = Number(e.target.value)
                updateSettings({
                  intervalMax: v,
                  intervalMin: Math.min(v, settings.intervalMin),
                })
              }}
              className="w-full"
            />

            <p className="mt-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-xs text-ink/60">
              🎲 Cada envio espera um tempo <b className="text-accent">aleatório</b> entre {settings.intervalMin} e{' '}
              {settings.intervalMax} min — evita o padrão robótico de intervalo fixo.
            </p>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-bg px-4 py-3">
            <span className="text-sm">
              <b>Respeitar horário comercial</b>
              <span className="block text-xs text-ink/50">08h–18h, segunda a sexta</span>
            </span>
            <button
              onClick={() => updateSettings({ businessHours: !settings.businessHours })}
              className={`relative h-6 w-11 rounded-full transition ${
                settings.businessHours ? 'bg-accent' : 'bg-border'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                  settings.businessHours ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </label>

          <div>
            <label className="mb-2 block text-sm text-ink/70">Modo de ordem</label>
            <div className="flex gap-2">
              <button
                onClick={() => updateSettings({ order: 'sequential' })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  settings.order === 'sequential'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-bg text-ink/60'
                }`}
              >
                <ListOrdered size={15} /> Sequencial
              </button>
              <button
                onClick={() => updateSettings({ order: 'random' })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  settings.order === 'random'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-bg text-ink/60'
                }`}
              >
                <Shuffle size={15} /> Aleatório
              </button>
            </div>
          </div>

          {/* Cycle visualization */}
          <div className="rounded-lg border border-border bg-bg p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
              Ciclo atual
            </p>
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-extrabold text-white"
                style={{ background: TEMPLATE_COLORS[nextTemplateIdx] }}
              >
                T{nextTemplateIdx + 1}
              </span>
              <div className="text-sm">
                <div className="text-ink/50">Próximo envio para</div>
                <div className="font-bold">{nextContact?.nome ?? '—'}</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3 pt-1">
            <button
              disabled={!connected || dispatch === 'running'}
              onClick={start}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold text-black transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play size={16} /> {dispatch === 'paused' ? 'Retomar' : 'Iniciar'}
            </button>
            <button
              disabled={!connected || dispatch !== 'running'}
              onClick={pause}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-bold text-black transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Pause size={16} /> Pausar
            </button>
            <button
              disabled={!connected || dispatch === 'stopped'}
              onClick={stop}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-bold text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Square size={16} /> Parar
            </button>
          </div>
        </div>

        {/* Countdown */}
        <div className="flex flex-col items-center justify-center rounded-card border border-border bg-card p-5">
          <CountdownRing progress={dispatch === 'running' ? progress : 0} mm={dispatch === 'running' ? mm : '00'} ss={dispatch === 'running' ? ss : '00'} />
          <div className="mt-4 text-center">
            {outsideHours ? (
              <p className="text-sm font-semibold text-amber-400">Fora do horário comercial ⏸</p>
            ) : dispatch === 'running' && nextContact ? (
              <>
                <p className="text-xs text-ink/50">Próximo</p>
                <p className="font-bold">{nextContact.nome}</p>
                <span
                  className="mt-1 inline-block rounded px-2 py-0.5 text-xs font-bold text-white"
                  style={{ background: TEMPLATE_COLORS[nextTemplateIdx] }}
                >
                  Template {nextTemplateIdx + 1}
                </span>
              </>
            ) : (
              <p className="text-sm text-ink/50">
                {dispatch === 'paused' ? 'Pausado' : 'Aguardando início'}
              </p>
            )}
          </div>
          <div className="mt-3 text-xs text-ink/40">
            {dispatch === 'running' && `Posição ${queuePos + 1} de ${queue.length}`}
          </div>
        </div>
      </div>

      {/* Log */}
      <div className="rounded-card border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Log em tempo real</h3>
          <span className="flex items-center gap-1.5 text-xs text-ink/50">
            <span className={`h-2 w-2 rounded-full ${dispatch === 'running' ? 'animate-pulse bg-accent' : 'bg-ink/30'}`} />
            {dispatch === 'running' ? 'Ao vivo' : 'Parado'}
          </span>
        </div>
        <div className="h-64 overflow-y-auto p-3 font-mono text-xs">
          {log.length === 0 && <p className="p-4 text-center text-ink/30">Nenhuma atividade ainda.</p>}
          {log.map((l) => (
            <div
              key={l.id}
              className={`px-1 py-0.5 ${
                l.kind === 'success'
                  ? 'text-accent'
                  : l.kind === 'error'
                    ? 'text-red-400'
                    : 'text-ink/60'
              }`}
            >
              <span className="text-ink/40">[{l.time}]</span> {l.text}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  )
}
