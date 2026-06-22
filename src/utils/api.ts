import { io, type Socket } from 'socket.io-client'

// Backend (whatsapp-web.js) base URL.
// In production set VITE_API_URL to your backend's public address;
// defaults to localhost for local dev.
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3001'

export type WaStatus = 'disconnected' | 'qr' | 'authenticated' | 'connected'

export interface WaState {
  status: WaStatus
  qr: string | null
  me: { number: string; pushname: string } | null
}

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { transports: ['websocket', 'polling'] })
  }
  return socket
}

export async function fetchStatus(): Promise<WaState | null> {
  try {
    const r = await fetch(`${API_URL}/api/status`)
    if (!r.ok) return null
    return (await r.json()) as WaState
  } catch {
    return null
  }
}

export async function logoutWa(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/logout`, { method: 'POST' })
  } catch {
    /* ignore */
  }
}

export interface SendPayload {
  phone: string
  message: string
  imageBase64?: string | null
  caption?: string
}

export async function sendMessage(
  payload: SendPayload,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(`${API_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await r.json().catch(() => ({}))
    return { ok: r.ok && data.ok, error: data.error }
  } catch (e) {
    return { ok: false, error: 'Backend offline. Rode "npm run server".' }
  }
}
