import { io, type Socket } from 'socket.io-client'

// Backend (whatsapp-web.js) base URL. Defaults to localhost.
// Em produção, defina VITE_API_URL para o endereço público do backend.
export function getApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined
  return (envUrl || 'http://localhost:3001').replace(/\/$/, '')
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return { ...extra }
}

export type WaStatus = 'starting' | 'disconnected' | 'qr' | 'authenticated' | 'connected'

export interface ChipSession {
  id: string
  name: string
  status: WaStatus
  qr: string | null
  me: { number: string | null; pushname: string | null } | null
}

let socket: Socket | null = null

// Identifica este aparelho/aba (para não aplicar o próprio estado de volta).
export const CLIENT_ID = Math.random().toString(36).slice(2)

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getApiUrl(), { transports: ['websocket', 'polling'] })
  }
  return socket
}

/** Envia uma ação para o servidor (estado compartilhado entre todos os aparelhos). */
export function sendAction(type: string, payload?: unknown) {
  getSocket().emit('action', { type, payload })
}

export async function fetchSessions(): Promise<ChipSession[] | null> {
  try {
    const r = await fetch(`${getApiUrl()}/api/sessions`, { headers: authHeaders() })
    if (!r.ok) return null
    return (await r.json()) as ChipSession[]
  } catch {
    return null
  }
}

export async function addSession(name: string): Promise<{ id: string; name: string } | null> {
  try {
    const r = await fetch(`${getApiUrl()}/api/sessions`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name }),
    })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export async function logoutSession(id: string): Promise<void> {
  try {
    await fetch(`${getApiUrl()}/api/sessions/${id}/logout`, {
      method: 'POST',
      headers: authHeaders(),
    })
  } catch {
    /* ignore */
  }
}

export async function reconnectSession(id: string): Promise<void> {
  try {
    await fetch(`${getApiUrl()}/api/sessions/${id}/reconnect`, {
      method: 'POST',
      headers: authHeaders(),
    })
  } catch {
    /* ignore */
  }
}

export interface SendPayload {
  sessionId?: string
  phone: string
  message: string
  imageBase64?: string | null
  caption?: string
}

export interface SendResult {
  ok: boolean
  error?: string
  sessionId?: string
  chip?: string
}

export async function sendMessage(payload: SendPayload): Promise<SendResult> {
  try {
    const r = await fetch(`${getApiUrl()}/api/send`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    const data = await r.json().catch(() => ({}))
    return { ok: r.ok && data.ok, error: data.error, sessionId: data.sessionId, chip: data.chip }
  } catch {
    return { ok: false, error: 'Backend offline ou inacessível.' }
  }
}
