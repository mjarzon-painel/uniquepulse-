import { io, type Socket } from 'socket.io-client'

// ---- Backend configuration (runtime, stored in localStorage) ----
// The deployed frontend has no baked-in backend address or secret.
// The user configures the public backend URL + access token in the app,
// so nothing sensitive lives in the public bundle.
const URL_KEY = 'wa_backend_url'
const TOKEN_KEY = 'wa_backend_token'

export function getApiUrl(): string {
  const saved = localStorage.getItem(URL_KEY)
  const envUrl = import.meta.env.VITE_API_URL as string | undefined
  return (saved || envUrl || 'http://localhost:3001').replace(/\/$/, '')
}

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function getBackendConfig() {
  return { url: getApiUrl(), token: getToken() }
}

/** Persist backend URL + token. Returns true if anything changed. */
export function setBackendConfig(url: string, token: string): boolean {
  const changed = getApiUrl() !== url.replace(/\/$/, '') || getToken() !== token
  if (url.trim()) localStorage.setItem(URL_KEY, url.trim().replace(/\/$/, ''))
  else localStorage.removeItem(URL_KEY)
  if (token.trim()) localStorage.setItem(TOKEN_KEY, token.trim())
  else localStorage.removeItem(TOKEN_KEY)
  return changed
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { ...extra }
  const t = getToken()
  if (t) h['x-wa-token'] = t
  return h
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

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getApiUrl(), {
      transports: ['websocket', 'polling'],
      auth: { token: getToken() },
    })
  }
  return socket
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

/** Lightweight reachability + auth check. */
export async function pingBackend(): Promise<'ok' | 'unauthorized' | 'offline'> {
  try {
    const r = await fetch(`${getApiUrl()}/api/sessions`, { headers: authHeaders() })
    if (r.status === 401) return 'unauthorized'
    return r.ok ? 'ok' : 'offline'
  } catch {
    return 'offline'
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
