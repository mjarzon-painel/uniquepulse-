import { io, type Socket } from 'socket.io-client'

// Backend (whatsapp-web.js) base URL.
// In production set VITE_API_URL to your backend's public address;
// defaults to localhost for local dev.
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3001'

export type WaStatus = 'starting' | 'disconnected' | 'qr' | 'authenticated' | 'connected'

export interface ChipSession {
  id: string
  name: string
  status: WaStatus
  qr: string | null
  me: { number: string | null; pushname: string | null } | null
}

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { transports: ['websocket', 'polling'] })
  }
  return socket
}

export async function fetchSessions(): Promise<ChipSession[] | null> {
  try {
    const r = await fetch(`${API_URL}/api/sessions`)
    if (!r.ok) return null
    return (await r.json()) as ChipSession[]
  } catch {
    return null
  }
}

export async function addSession(name: string): Promise<{ id: string; name: string } | null> {
  try {
    const r = await fetch(`${API_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    await fetch(`${API_URL}/api/sessions/${id}/logout`, { method: 'POST' })
  } catch {
    /* ignore */
  }
}

export async function reconnectSession(id: string): Promise<void> {
  try {
    await fetch(`${API_URL}/api/sessions/${id}/reconnect`, { method: 'POST' })
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
    const r = await fetch(`${API_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await r.json().catch(() => ({}))
    return { ok: r.ok && data.ok, error: data.error, sessionId: data.sessionId, chip: data.chip }
  } catch {
    return { ok: false, error: 'Backend offline. Rode "npm run server".' }
  }
}
