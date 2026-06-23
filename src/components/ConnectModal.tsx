import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, Smartphone, X, QrCode, KeyRound } from 'lucide-react'
import { useStore } from '../store/useStore'
import { requestPairingCode } from '../utils/api'

/** Modal para conectar um chip — por QR ou por código de telefone. */
export default function ConnectModal({
  sessionId,
  onClose,
}: {
  sessionId: string
  onClose: () => void
}) {
  const session = useStore((s) => s.sessions.find((x) => x.id === sessionId))
  const status = session?.status ?? 'starting'

  const [mode, setMode] = useState<'qr' | 'code'>('qr')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (status === 'connected') {
      const t = setTimeout(onClose, 1200)
      return () => clearTimeout(t)
    }
  }, [status, onClose])

  async function gerarCodigo() {
    setErr('')
    setCode('')
    setLoading(true)
    const res = await requestPairingCode(sessionId, phone)
    setLoading(false)
    if (res.ok && res.code) setCode(res.code)
    else setErr(res.error || 'Não foi possível gerar o código.')
  }

  const connected = status === 'connected'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="Unique" className="h-8 w-8 object-contain" />
            <div>
              <h3 className="text-lg font-bold leading-none">Conectar chip</h3>
              <p className="text-xs text-ink/50">{session?.name ?? '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink/50 transition hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {connected ? (
          <div className="flex flex-col items-center py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent">
              <Check size={48} className="text-black" />
            </div>
            <p className="mt-3 text-lg font-bold">Conectado!</p>
            {session?.me?.pushname && <p className="text-sm text-ink/60">{session.me.pushname}</p>}
          </div>
        ) : (
          <>
            {/* Alternador QR / Código */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setMode('qr')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  mode === 'qr' ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg text-ink/60'
                }`}
              >
                <QrCode size={15} /> QR Code
              </button>
              <button
                onClick={() => setMode('code')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  mode === 'code' ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg text-ink/60'
                }`}
              >
                <KeyRound size={15} /> Código de telefone
              </button>
            </div>

            {mode === 'qr' ? (
              <div className="flex flex-col items-center">
                <div className="relative mx-auto flex aspect-square w-full max-w-[300px] items-center justify-center rounded-lg bg-white">
                  {session?.qr ? (
                    <img src={session.qr} alt="QR Code do WhatsApp" className="h-full w-full object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center text-bg">
                      <Loader2 size={40} className="animate-spin text-accent" />
                      <p className="mt-3 text-sm font-medium text-gray-700">
                        {status === 'authenticated' ? 'Autenticando…' : 'Gerando QR Code…'}
                      </p>
                    </div>
                  )}
                </div>
                <p className="mt-4 flex items-center gap-2 text-sm font-medium text-ink">
                  <Smartphone size={16} className="text-accent" /> Escaneie com o WhatsApp do número
                </p>
                <ol className="mt-3 w-full space-y-1 rounded-lg border border-border bg-bg p-3 text-xs leading-relaxed text-ink/60">
                  <li>1. WhatsApp → <b className="text-ink/80">Dispositivos conectados</b></li>
                  <li>2. <b className="text-ink/80">Conectar dispositivo</b> e aponte para o QR</li>
                </ol>
              </div>
            ) : (
              <div className="flex flex-col">
                <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Número do WhatsApp (com DDI 55 + DDD)
                </label>
                <div className="flex gap-2">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="5519998887777"
                    className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent"
                  />
                  <button
                    onClick={gerarCodigo}
                    disabled={loading || phone.replace(/\D/g, '').length < 12}
                    className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition enabled:hover:brightness-110 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                    Gerar
                  </button>
                </div>

                {err && <p className="mt-2 text-xs text-red-400">{err}</p>}

                {code && (
                  <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-4 text-center">
                    <p className="text-xs text-ink/60">Seu código:</p>
                    <p className="my-1 font-mono text-3xl font-extrabold tracking-[0.3em] text-accent">{code}</p>
                  </div>
                )}

                <ol className="mt-4 w-full space-y-1 rounded-lg border border-border bg-bg p-3 text-xs leading-relaxed text-ink/60">
                  <li>1. WhatsApp → <b className="text-ink/80">Dispositivos conectados</b></li>
                  <li>2. <b className="text-ink/80">Conectar dispositivo</b></li>
                  <li>3. Toque em <b className="text-ink/80">Conectar com número de telefone</b></li>
                  <li>4. Digite o <b className="text-ink/80">código</b> acima no celular</li>
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
