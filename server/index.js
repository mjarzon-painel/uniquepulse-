import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import { Server } from 'socket.io'
import qrcode from 'qrcode'
import pkg from 'whatsapp-web.js'

const { Client, LocalAuth, MessageMedia } = pkg

const PORT = 3001
const __dirname = path.dirname(fileURLToPath(import.meta.url)) // .../app/server
const DATA_DIR = path.resolve(__dirname, '..', '..') // pasta raiz (acima de /app) — persiste entre updates
const AUTH_DIR = path.join(DATA_DIR, '.wwebjs_auth')
const NAMES_FILE = path.join(AUTH_DIR, 'names.json')
const STATE_FILE = path.join(DATA_DIR, 'app-state.json')

// Chave de acesso. Defina WA_TOKEN ao expor o backend na internet.
const TOKEN = process.env.WA_TOKEN || ''

const app = express()
app.use(cors())
app.use(express.json({ limit: '20mb' }))

app.use('/api', (req, res, next) => {
  if (!TOKEN) return next()
  if (req.headers['x-wa-token'] === TOKEN) return next()
  return res.status(401).json({ ok: false, error: 'Não autorizado (token inválido).' })
})

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' }, maxHttpBufferSize: 2e7 })

io.use((socket, next) => {
  if (!TOKEN) return next()
  if (socket.handshake.auth?.token === TOKEN) return next()
  next(new Error('unauthorized'))
})

// ===================== Helpers =====================
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
function digits(s) {
  return (s || '').toString().replace(/\D/g, '')
}
function isValidPhone(raw) {
  const d = digits(raw)
  if (d.length === 12 || d.length === 13) return d.startsWith('55')
  return d.length === 10 || d.length === 11
}
function formatPhone(raw) {
  let d = digits(raw)
  if (d.length === 10 || d.length === 11) d = '55' + d
  return '+' + d
}
function randomIntervalMs(a, b) {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return Math.round((lo + Math.random() * (hi - lo)) * 60000)
}
function msToClock(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}
function isWithinBusinessHours(d = new Date()) {
  const day = d.getDay()
  const h = d.getHours()
  return day >= 1 && day <= 5 && h >= 8 && h < 18
}
function isFilled(t) {
  return (t.text && t.text.trim().length > 0) || !!t.image
}
function filledTemplateIds(ts) {
  const f = ts.filter(isFilled).map((t) => t.id)
  return f.length ? f : [ts[0]?.id ?? 0]
}
function templateForPosition(pos, ts) {
  const ids = filledTemplateIds(ts)
  return ids[pos % ids.length]
}
function personalize(text, nome) {
  return (text || '').replace(/\{\{\s*nome\s*\}\}/gi, nome)
}
function nowTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false })
}
function nowDateTime() {
  return new Date().toLocaleString('pt-BR', { hour12: false })
}

// ===================== Estado compartilhado =====================
const DEFAULT_TEMPLATES = [
  { id: 0, name: 'Oferta Direta', text: 'Olá {{nome}}! 🚗 Temos uma oferta imperdível esperando por você. Condições especiais com entrada facilitada. Quer saber mais?', image: null, caption: 'Oferta especial para você, {{nome}}!' },
  { id: 1, name: 'Abordagem Consultiva', text: 'Oi {{nome}}, tudo bem? Sou consultor da loja e gostaria de entender o que você procura para te ajudar a encontrar o carro ideal. Posso te fazer algumas perguntas?', image: null, caption: 'Estamos aqui para te ajudar, {{nome}}.' },
  { id: 2, name: 'Urgência', text: '⏰ {{nome}}, últimas unidades com esse preço! A promoção acaba hoje. Garanta já o seu antes que esgote!', image: null, caption: 'Corre, {{nome}}! Acaba hoje.' },
]

function defaultState() {
  return {
    contacts: [],
    templates: DEFAULT_TEMPLATES,
    settings: { intervalMin: 8, intervalMax: 15, businessHours: false, order: 'sequential' },
    dispatchChips: [],
    dispatch: 'stopped',
    queue: [],
    queuePos: 0,
    chipCursor: 0,
    nextSendAt: null,
    currentIntervalMs: 0,
    sending: false,
    log: [],
    history: [],
    showCompletion: false,
  }
}

let appState = (() => {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    const merged = { ...defaultState(), ...s }
    merged.sending = false
    return merged
  } catch {
    return defaultState()
  }
})()

let saveTimer = null
function saveState() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(appState))
    } catch (e) {
      console.error('[state] save erro', e?.message)
    }
  }, 500)
}
function broadcastApp() {
  io.emit('app-state', appState)
  saveState()
}
function pushLog(line) {
  appState.log = [...appState.log, { id: uid(), time: nowTime(), ...line }].slice(-50)
}

// ===================== Sessões (chips) =====================
const sessions = new Map()

function loadNames() {
  try {
    return JSON.parse(fs.readFileSync(NAMES_FILE, 'utf8'))
  } catch {
    return {}
  }
}
function saveNames() {
  const map = {}
  for (const s of sessions.values()) map[s.id] = s.name
  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true })
    fs.writeFileSync(NAMES_FILE, JSON.stringify(map, null, 2))
  } catch (e) {
    console.error('[wa] erro ao salvar nomes', e?.message)
  }
}
function publicSessions() {
  return [...sessions.values()].map((s) => ({ id: s.id, name: s.name, status: s.status, qr: s.qr, me: s.me }))
}
function emitSessions() {
  io.emit('sessions', publicSessions())
}
function puppeteerOpts() {
  return {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run'],
  }
}
function stopWatch(s) {
  if (s.readyWatch) {
    clearInterval(s.readyWatch)
    s.readyWatch = null
  }
}
function markConnected(s) {
  stopWatch(s)
  s.misses = 0
  const me = s.client.info?.wid?.user ?? null
  const pushname = s.client.info?.pushname ?? null
  s.status = 'connected'
  s.qr = null
  s.me = { number: me, pushname }
  if (me && /^Chip /.test(s.name)) {
    s.name = pushname ? `${pushname}` : me
    saveNames()
  }
  console.log(`[wa:${s.id}] CONECTADO ✓ ${pushname ?? ''} (${me ?? '—'})`)
  emitSessions()
}
function startWatch(s) {
  if (s.readyWatch) return
  let tries = 0
  s.readyWatch = setInterval(async () => {
    tries++
    try {
      if ((await s.client.getState()) === 'CONNECTED') markConnected(s)
    } catch {
      /* carregando */
    }
    if (tries >= 60 && s.readyWatch) stopWatch(s)
  }, 3000)
}
function wireEvents(s) {
  const { client } = s
  client.on('qr', async (qr) => {
    try {
      s.qr = await qrcode.toDataURL(qr, { margin: 1, width: 320 })
      s.status = 'qr'
      console.log(`[wa:${s.id}] QR gerado.`)
      emitSessions()
    } catch (e) {
      console.error(`[wa:${s.id}] erro QR`, e?.message)
    }
  })
  client.on('loading_screen', () => {
    s.status = 'authenticated'
    emitSessions()
  })
  client.on('change_state', (st) => {
    if (st === 'CONNECTED') markConnected(s)
  })
  client.on('authenticated', () => {
    s.status = 'authenticated'
    s.qr = null
    emitSessions()
    startWatch(s)
  })
  client.on('ready', () => markConnected(s))
  client.on('auth_failure', (m) => {
    console.error(`[wa:${s.id}] auth_failure`, m)
    s.status = 'disconnected'
    s.qr = null
    emitSessions()
  })
  client.on('disconnected', (reason) => {
    console.warn(`[wa:${s.id}] desconectado:`, reason)
    stopWatch(s)
    s.status = 'disconnected'
    s.qr = null
    s.me = null
    emitSessions()
  })
}
function createSession(id, name) {
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: id, dataPath: AUTH_DIR }),
    puppeteer: puppeteerOpts(),
  })
  const s = { id, name, status: 'starting', qr: null, me: null, client, readyWatch: null, misses: 0 }
  sessions.set(id, s)
  wireEvents(s)
  client.initialize().catch((e) => {
    console.error(`[wa:${id}] initialize falhou`, e?.message)
    s.status = 'disconnected'
    emitSessions()
  })
  emitSessions()
  return s
}
async function destroySession(id) {
  const s = sessions.get(id)
  if (!s) return
  stopWatch(s)
  try { await s.client.logout() } catch { /* */ }
  try { await s.client.destroy() } catch { /* */ }
  sessions.delete(id)
  saveNames()
  emitSessions()
  try { fs.rmSync(path.join(AUTH_DIR, `session-${id}`), { recursive: true, force: true }) } catch { /* */ }
}
function restoreSessions() {
  const names = loadNames()
  let dirs = []
  try {
    dirs = fs.readdirSync(AUTH_DIR).filter((d) => d.startsWith('session-')).map((d) => d.replace('session-', ''))
  } catch {
    dirs = []
  }
  for (const id of dirs) createSession(id, names[id] || `Chip ${id.slice(0, 4)}`)
  if (dirs.length) console.log(`[wa] restaurando ${dirs.length} chip(s)…`)
}

function toChatId(phone) {
  return digits(phone) + '@c.us'
}
function dispatchPool() {
  const connected = [...sessions.values()].filter((s) => s.status === 'connected')
  const ids = appState.dispatchChips || []
  return ids.length ? connected.filter((s) => ids.includes(s.id)) : connected
}
async function sendToChip(chip, phone, message, imageBase64, caption) {
  const numberId = await chip.client.getNumberId(digits(phone))
  if (!numberId) throw new Error('Número não está no WhatsApp')
  if (imageBase64) {
    const m = imageBase64.match(/^data:(.+);base64,(.*)$/)
    const mimetype = m ? m[1] : 'image/jpeg'
    const data = m ? m[2] : imageBase64
    const media = new MessageMedia(mimetype, data, 'imagem')
    await chip.client.sendMessage(numberId._serialized, media, { caption: caption || message || '' })
  } else {
    await chip.client.sendMessage(numberId._serialized, message || '')
  }
}

// ===================== Motor de disparo (no servidor) =====================
let sendingLock = false

async function processNext() {
  if (sendingLock) return
  const s = appState
  if (s.queuePos >= s.queue.length) {
    s.dispatch = 'stopped'
    s.nextSendAt = null
    s.showCompletion = true
    broadcastApp()
    return
  }
  const id = s.queue[s.queuePos]
  const contact = s.contacts.find((c) => c.id === id)
  if (!contact) {
    s.queuePos++
    broadcastApp()
    return
  }
  const pool = dispatchPool()
  if (!pool.length) {
    s.dispatch = 'paused'
    s.nextSendAt = null
    pushLog({ kind: 'error', text: '⚠️ Nenhum chip conectado/habilitado — disparo pausado.' })
    broadcastApp()
    return
  }
  const chip = pool[s.chipCursor % pool.length]
  s.chipCursor++
  const tIdx = templateForPosition(s.queuePos, s.templates)
  const tmpl = s.templates.find((t) => t.id === tIdx) ?? s.templates[0]
  const msg = personalize(tmpl.text, contact.nome)
  const caption = personalize(tmpl.caption, contact.nome)

  sendingLock = true
  s.sending = true
  s.nextSendAt = null
  pushLog({ kind: 'info', text: `📤 Enviando Template ${tIdx + 1} via 📱${chip.name} → ${contact.nome} (${contact.telefone})…` })
  broadcastApp()

  let ok = false
  let err = ''
  try {
    await sendToChip(chip, contact.telefone, msg, tmpl.image, caption)
    ok = true
  } catch (e) {
    err = e?.message || 'erro'
  }

  contact.status = ok ? 'sent' : 'error'
  contact.templateUsed = tIdx
  s.history = [
    { id: uid(), datetime: nowDateTime(), ts: Date.now(), nome: contact.nome, telefone: contact.telefone, template: tIdx, status: ok ? 'sent' : 'error', preview: msg.slice(0, 120), chip: chip.name },
    ...s.history,
  ].slice(0, 2000)
  if (ok) pushLog({ kind: 'success', text: `✅ Template ${tIdx + 1} via 📱${chip.name} → ${contact.nome} (${contact.telefone})` })
  else pushLog({ kind: 'error', text: `❌ Falha via 📱${chip.name} → ${contact.nome} — ${err}` })

  const nextPos = s.queuePos + 1
  const finished = nextPos >= s.queue.length
  s.queuePos = nextPos
  if (finished) {
    s.dispatch = 'stopped'
    s.nextSendAt = null
    s.showCompletion = true
  } else if (s.dispatch === 'running') {
    const iv = randomIntervalMs(s.settings.intervalMin, s.settings.intervalMax)
    s.nextSendAt = Date.now() + iv
    s.currentIntervalMs = iv
    const nextC = s.contacts.find((c) => c.id === s.queue[nextPos])
    pushLog({ kind: 'info', text: `⏳ Próximo envio em ${msToClock(iv)} → ${nextC?.nome ?? '—'} — Template ${templateForPosition(nextPos, s.templates) + 1}` })
  }
  s.sending = false
  sendingLock = false
  broadcastApp()
}

setInterval(() => {
  const s = appState
  if (s.dispatch !== 'running' || sendingLock || s.nextSendAt == null) return
  if (Date.now() < s.nextSendAt) return
  if (s.settings.businessHours && !isWithinBusinessHours()) return
  processNext()
}, 1000)

function startDispatch() {
  const s = appState
  if (s.dispatch === 'paused' && s.queue.length) {
    const iv = randomIntervalMs(s.settings.intervalMin, s.settings.intervalMax)
    s.dispatch = 'running'
    s.nextSendAt = Date.now() + iv
    s.currentIntervalMs = iv
    pushLog({ kind: 'info', text: `▶️ Disparo retomado — próximo em ${msToClock(iv)}.` })
    broadcastApp()
    return
  }
  let pending = s.contacts.filter((c) => c.status === 'pending').map((c) => c.id)
  if (!pending.length) {
    pushLog({ kind: 'info', text: '⚠️ Nenhum contato pendente para disparar.' })
    broadcastApp()
    return
  }
  if (s.settings.order === 'random') {
    for (let i = pending.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pending[i], pending[j]] = [pending[j], pending[i]]
    }
  }
  const iv = randomIntervalMs(s.settings.intervalMin, s.settings.intervalMax)
  const pool = dispatchPool()
  s.dispatch = 'running'
  s.queue = pending
  s.queuePos = 0
  s.chipCursor = 0
  s.nextSendAt = Date.now() + iv
  s.currentIntervalMs = iv
  pushLog({ kind: 'info', text: `🚀 Campanha iniciada — ${pending.length} contato(s). Revezando ${pool.length} chip(s), intervalo ${s.settings.intervalMin}–${s.settings.intervalMax} min. Próximo em ${msToClock(iv)}.` })
  broadcastApp()
}

// ===================== Ações (de qualquer aparelho) =====================
function handleAction(type, payload = {}) {
  const s = appState
  switch (type) {
    case 'importContacts': {
      const seen = new Set(s.contacts.map((c) => formatPhone(c.telefone)))
      for (const r of payload.rows || []) {
        const nome = (r.nome || '').trim()
        const tel = (r.telefone || '').trim()
        if (!tel || !isValidPhone(tel)) continue
        const norm = formatPhone(tel)
        if (seen.has(norm)) continue
        seen.add(norm)
        s.contacts.push({ id: uid(), nome: nome || norm, telefone: norm, status: 'pending', templateUsed: null })
      }
      break
    }
    case 'addContact': {
      const tel = (payload.telefone || '').trim()
      if (tel && isValidPhone(tel)) {
        const norm = formatPhone(tel)
        if (!s.contacts.some((c) => formatPhone(c.telefone) === norm))
          s.contacts.push({ id: uid(), nome: (payload.nome || '').trim() || norm, telefone: norm, status: 'pending', templateUsed: null })
      }
      break
    }
    case 'removeContact':
      s.contacts = s.contacts.filter((c) => c.id !== payload.id)
      break
    case 'clearList':
      s.contacts = []
      s.dispatch = 'stopped'
      s.queue = []
      s.queuePos = 0
      s.nextSendAt = null
      break
    case 'resetStatus':
      s.contacts = s.contacts.map((c) => ({ ...c, status: 'pending', templateUsed: null }))
      s.dispatch = 'stopped'
      s.queue = []
      s.queuePos = 0
      s.nextSendAt = null
      break
    case 'updateTemplate':
      s.templates = s.templates.map((t) => (t.id === payload.id ? { ...t, ...payload.patch } : t))
      break
    case 'updateSettings':
      s.settings = { ...s.settings, ...payload.patch }
      break
    case 'toggleDispatchChip': {
      const cur = s.dispatchChips || []
      s.dispatchChips = cur.includes(payload.id) ? cur.filter((x) => x !== payload.id) : [...cur, payload.id]
      break
    }
    case 'start':
      return startDispatch()
    case 'pause':
      if (s.dispatch === 'running') {
        s.dispatch = 'paused'
        s.nextSendAt = null
        pushLog({ kind: 'info', text: '⏸️ Disparo pausado.' })
      }
      break
    case 'stop':
      s.dispatch = 'stopped'
      s.queue = []
      s.queuePos = 0
      s.nextSendAt = null
      pushLog({ kind: 'info', text: '⏹️ Disparo parado.' })
      break
    case 'resetCampaign':
      s.contacts = s.contacts.map((c) => ({ ...c, status: 'pending', templateUsed: null }))
      s.dispatch = 'stopped'
      s.queue = []
      s.queuePos = 0
      s.nextSendAt = null
      s.showCompletion = false
      s.log = []
      break
    case 'closeCompletion':
      s.showCompletion = false
      break
    default:
      return
  }
  broadcastApp()
}

// ===================== Socket =====================
io.on('connection', (socket) => {
  socket.emit('sessions', publicSessions())
  socket.emit('app-state', appState)
  socket.on('action', (msg) => {
    try {
      handleAction(msg?.type, msg?.payload || {})
    } catch (e) {
      console.error('[action] erro', e?.message)
    }
  })
})

// ===================== REST =====================
app.get('/api/state', (_req, res) => res.json(appState))
app.get('/api/sessions', (_req, res) => res.json(publicSessions()))

app.post('/api/sessions', (req, res) => {
  const name = (req.body?.name || '').trim() || 'Novo chip'
  const id = 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)
  createSession(id, name)
  saveNames()
  res.json({ id, name })
})
app.post('/api/sessions/:id/logout', async (req, res) => {
  await destroySession(req.params.id)
  res.json({ ok: true })
})
app.post('/api/sessions/:id/reconnect', async (req, res) => {
  const s = sessions.get(req.params.id)
  if (!s) return res.status(404).json({ ok: false })
  const { id, name } = s
  stopWatch(s)
  try { await s.client.destroy() } catch { /* */ }
  sessions.delete(id)
  createSession(id, name)
  res.json({ ok: true })
})

// Health monitor
setInterval(async () => {
  for (const s of sessions.values()) {
    if (s.status !== 'connected') continue
    let ok = false
    try {
      ok = (await s.client.getState()) === 'CONNECTED'
    } catch {
      ok = false
    }
    if (ok) s.misses = 0
    else {
      s.misses = (s.misses || 0) + 1
      if (s.misses >= 2) {
        console.warn(`[wa:${s.id}] queda detectada.`)
        s.status = 'disconnected'
        s.qr = null
        s.me = null
        s.misses = 0
        stopWatch(s)
        emitSessions()
      }
    }
  }
}, 15000)

httpServer.listen(PORT, () => {
  console.log(`\n  UniquePulse backend (compartilhado) em http://localhost:${PORT}`)
  console.log(`  Proteção por token: ${TOKEN ? 'ATIVA ✓' : 'desligada'}`)
  console.log(`  Dados em: ${STATE_FILE}`)
  restoreSessions()
})
