import { useEffect, useState } from 'react'
import { Plus, Smartphone, Trash2, QrCode, Loader2, CheckCircle2, WifiOff, Save, Cloud } from 'lucide-react'
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
  const sendMode = useStore((s) => s.sendMode)
  const api = useStore((s) => s.api)
  const setSendMode = useStore((s) => s.setSendMode)
  const updateApi = useStore((s) => s.updateApi)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Form local da API (token nunca é pré-preenchido por segurança).
  const [token, setToken] = useState('')
  const [phoneId, setPhoneId] = useState('')
  const [tmplName, setTmplName] = useState('')
  const [lang, setLang] = useState('pt_BR')
  const [imageUrl, setImageUrl] = useState('')
  const [apiSaved, setApiSaved] = useState(false)
  useEffect(() => {
    setPhoneId(api.phoneId || '')
    setTmplName(api.template || '')
    setLang(api.lang || 'pt_BR')
    setImageUrl(api.imageUrl || '')
  }, [api.phoneId, api.template, api.lang, api.imageUrl])

  function saveApi() {
    updateApi({ token, phoneId, template: tmplName, lang, imageUrl })
    setToken('')
    setApiSaved(true)
    setTimeout(() => setApiSaved(false), 1800)
  }

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Conexões (Chips)</h2>
          <p className="text-sm text-ink/60">
            Conecte vários números de WhatsApp. O disparo reveza entre os chips conectados (round-robin).
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Adicionar chip
        </button>
      </div>

      {/* Modo de envio */}
      <div className="rounded-card border border-border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">Modo de envio</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => setSendMode('chip')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              sendMode === 'chip' ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg text-ink/60'
            }`}
          >
            <Smartphone size={15} /> Chips (WhatsApp Web)
          </button>
          <button
            onClick={() => setSendMode('api')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              sendMode === 'api' ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg text-ink/60'
            }`}
          >
            <Cloud size={15} /> API Oficial (Meta)
          </button>
        </div>

        {sendMode === 'api' && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <p className="text-xs text-ink/50">
              Envio pela API oficial da Meta — sem risco de ban. Requer um <b>template aprovado</b> e tem custo por mensagem.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-ink/50">
                  Access Token {api.token === '__SET__' && <span className="text-accent">(configurado ✓)</span>}
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={api.token === '__SET__' ? '•••••• (deixe vazio p/ manter)' : 'cole o token aqui'}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink/50">Phone Number ID</label>
                <input value={phoneId} onChange={(e) => setPhoneId(e.target.value)} placeholder="1221831344344055"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink/50">Nome do template</label>
                <input value={tmplName} onChange={(e) => setTmplName(e.target.value)} placeholder="ultra_feirao_unique"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink/50">Idioma do template</label>
                <input value={lang} onChange={(e) => setLang(e.target.value)} placeholder="pt_BR"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink/50">URL pública da imagem (cabeçalho)</label>
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://.../feirao.jpg"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent" />
              </div>
            </div>
            <button
              onClick={saveApi}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
            >
              {apiSaved ? <CheckCircle2 size={16} /> : <Save size={16} />} {apiSaved ? 'Salvo!' : 'Salvar API'}
            </button>
          </div>
        )}
      </div>

      {sendMode === 'chip' && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
          <CheckCircle2 size={16} className="text-accent" />
          <span className="text-ink/70">
            <b className="text-ink">{connectedCount}</b> de <b className="text-ink">{sessions.length}</b> chip(s)
            conectado(s)
          </span>
        </div>
      )}

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
