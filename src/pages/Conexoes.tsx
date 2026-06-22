import { useState } from 'react'
import { Plus, Smartphone, Trash2, QrCode, Loader2, CheckCircle2, WifiOff } from 'lucide-react'
import { useStore } from '../store/useStore'
import { addSession, logoutSession, reconnectSession, type WaStatus } from '../utils/api'
import ConnectModal from '../components/ConnectModal'

const STATUS_INFO: Record<WaStatus, { label: string; cls: string }> = {
  starting: { label: 'Iniciando…', cls: 'bg-white/10 text-ink/60' },
  qr: { label: 'Aguardando QR', cls: 'bg-brand/15 text-brand' },
  authenticated: { label: 'Autenticando…', cls: 'bg-amber-500/15 text-amber-400' },
  connected: { label: 'Conectado', cls: 'bg-accent/15 text-accent' },
  disconnected: { label: 'Desconectado', cls: 'bg-red-500/15 text-red-400' },
}

export default function Conexoes() {
  const sessions = useStore((s) => s.sessions)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleAdd() {
    setBusy(true)
    const name = `Chip ${sessions.length + 1}`
    const res = await addSession(name)
    setBusy(false)
    if (res) setOpenId(res.id) // open QR modal for the new chip
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remover/desconectar "${name}"? Será necessário escanear o QR de novo para reconectar.`)) return
    await logoutSession(id)
    if (openId === id) setOpenId(null)
  }

  async function handleReconnect(id: string) {
    setOpenId(id) // open modal immediately (shows "gerando QR…")
    await reconnectSession(id) // recreate the client: reconnects silently if session still valid, else emits QR
  }

  const connectedCount = sessions.filter((s) => s.status === 'connected').length

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold">Conexões (Chips)</h2>
          <p className="text-sm text-ink/60">
            Conecte vários números de WhatsApp. O disparo reveza entre os chips conectados (round-robin).
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Adicionar chip
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
        <CheckCircle2 size={16} className="text-accent" />
        <span className="text-ink/70">
          <b className="text-ink">{connectedCount}</b> de <b className="text-ink">{sessions.length}</b> chip(s)
          conectado(s)
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border-2 border-dashed border-border bg-card/40 p-10 text-center">
          <Smartphone size={32} className="mb-3 text-accent" />
          <p className="font-medium">Nenhum chip conectado ainda</p>
          <p className="mt-1 text-sm text-ink/50">
            Clique em <b>Adicionar chip</b> para escanear o QR de um WhatsApp.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => {
            const info = STATUS_INFO[s.status]
            return (
              <div key={s.id} className="rounded-card border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg">
                      <Smartphone size={18} className="text-accent" />
                    </div>
                    <div>
                      <div className="font-semibold leading-tight">{s.name}</div>
                      <div className="text-xs text-ink/50">
                        {s.me?.number ? `+${s.me.number}` : '—'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(s.id, s.name)}
                    className="text-ink/40 transition hover:text-red-400"
                    title="Remover/desconectar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${info.cls}`}>
                    {info.label}
                  </span>
                  {s.status === 'connected' ? (
                    <span className="flex items-center gap-1 text-xs text-accent">
                      <CheckCircle2 size={14} /> pronto
                    </span>
                  ) : (
                    <button
                      onClick={() => (s.status === 'disconnected' ? handleReconnect(s.id) : setOpenId(s.id))}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-semibold transition hover:border-accent"
                    >
                      {s.status === 'disconnected' ? <WifiOff size={13} /> : <QrCode size={13} />}
                      {s.status === 'disconnected' ? 'Reconectar' : 'Ver QR'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-ink/40">
        💡 Cada chip abre uma sessão própria do WhatsApp (consome memória). Mantenha cada celular com
        internet. A sessão fica salva — não precisa reescanear a cada vez.
      </p>

      {openId && <ConnectModal sessionId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}
