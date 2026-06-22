import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, Smartphone, X } from 'lucide-react'
import { useStore } from '../store/useStore'

/** QR modal for connecting one specific chip (WhatsApp session). */
export default function ConnectModal({
  sessionId,
  onClose,
}: {
  sessionId: string
  onClose: () => void
}) {
  const session = useStore((s) => s.sessions.find((x) => x.id === sessionId))
  const status = session?.status ?? 'starting'

  useEffect(() => {
    if (status === 'connected') {
      const t = setTimeout(onClose, 1200)
      return () => clearTimeout(t)
    }
  }, [status, onClose])

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

        <div className="flex flex-col items-center">
          <div className="relative mx-auto flex aspect-square w-full max-w-[300px] items-center justify-center rounded-lg bg-white">
            {status === 'connected' ? (
              <div className="flex flex-col items-center text-bg">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent">
                  <Check size={48} className="text-white" />
                </div>
                <p className="mt-3 font-bold">Conectado!</p>
                {session?.me?.pushname && <p className="text-sm text-gray-600">{session.me.pushname}</p>}
              </div>
            ) : session?.qr ? (
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

          <p className="mt-5 flex items-center gap-2 text-sm font-medium text-ink">
            <Smartphone size={16} className="text-accent" />
            {status === 'connected' ? 'Chip pronto para disparar.' : 'Escaneie o código com seu celular'}
          </p>
          <ol className="mt-3 w-full space-y-1 rounded-lg border border-border bg-bg p-3 text-xs leading-relaxed text-ink/60">
            <li>1. Abra o <b className="text-ink/80">WhatsApp</b> do número desejado</li>
            <li>2. <b className="text-ink/80">Mais opções (⋮)</b> → <b className="text-ink/80">Dispositivos conectados</b></li>
            <li>3. <b className="text-ink/80">Conectar dispositivo</b> e aponte para esta tela</li>
          </ol>
        </div>
      </div>
    </div>,
    document.body,
  )
}
