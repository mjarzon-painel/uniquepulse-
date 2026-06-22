import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, Smartphone, X, AlertTriangle } from 'lucide-react'
import { getSocket, fetchStatus, type WaState } from '../utils/api'

export default function ConnectModal({ onClose }: { onClose: () => void }) {
  const [wa, setWa] = useState<WaState | null>(null)
  const [backendDown, setBackendDown] = useState(false)

  useEffect(() => {
    let closed = false

    // Initial fetch (in case we're already connected/qr).
    fetchStatus().then((s) => {
      if (closed) return
      if (s) setWa(s)
      else setBackendDown(true)
    })

    const socket = getSocket()
    const onState = (s: WaState) => {
      setBackendDown(false)
      setWa(s)
      if (s.status === 'connected') {
        // brief success flash, then close
        setTimeout(() => !closed && onClose(), 1200)
      }
    }
    const onConnectError = () => setBackendDown(true)

    socket.on('state', onState)
    socket.on('connect_error', onConnectError)
    socket.io.on('error', onConnectError)

    return () => {
      closed = true
      socket.off('state', onState)
      socket.off('connect_error', onConnectError)
    }
  }, [onClose])

  const status = wa?.status ?? 'disconnected'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="Unique" className="h-8 w-8 object-contain" />
            <h3 className="text-lg font-bold">Conectar WhatsApp</h3>
          </div>
          <button onClick={onClose} className="text-ink/50 transition hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative flex h-[320px] w-[320px] items-center justify-center rounded-lg bg-white">
            {backendDown ? (
              <div className="px-6 text-center text-bg">
                <AlertTriangle size={40} className="mx-auto mb-2 text-amber-500" />
                <p className="font-semibold">Backend offline</p>
                <p className="mt-1 text-xs text-gray-600">
                  Inicie o servidor com <code className="rounded bg-gray-200 px-1">npm run server</code> e
                  reabra este modal.
                </p>
              </div>
            ) : status === 'connected' ? (
              <div className="flex flex-col items-center text-bg">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent">
                  <Check size={48} className="text-white" />
                </div>
                <p className="mt-3 font-bold">Conectado!</p>
                {wa?.me?.pushname && (
                  <p className="text-sm text-gray-600">{wa.me.pushname}</p>
                )}
              </div>
            ) : wa?.qr ? (
              <img src={wa.qr} alt="QR Code do WhatsApp" className="h-[300px] w-[300px]" />
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
            {status === 'connected'
              ? 'Tudo pronto para disparar.'
              : 'Escaneie o código com seu celular'}
          </p>
          <ol className="mt-3 w-full space-y-1 rounded-lg border border-border bg-bg p-3 text-xs leading-relaxed text-ink/60">
            <li>1. Abra o <b className="text-ink/80">WhatsApp</b> no seu celular</li>
            <li>2. Toque em <b className="text-ink/80">Mais opções (⋮)</b> → <b className="text-ink/80">Dispositivos conectados</b></li>
            <li>3. Toque em <b className="text-ink/80">Conectar dispositivo</b> e aponte para esta tela</li>
          </ol>
        </div>
      </div>
    </div>,
    document.body,
  )
}
