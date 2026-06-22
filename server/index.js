import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { createServer } from 'http'
import { Server } from 'socket.io'
import qrcode from 'qrcode'
import pkg from 'whatsapp-web.js'

const { Client, LocalAuth, MessageMedia } = pkg

const PORT = 3001
const AUTH_DIR = '.wwebjs_auth'
const NAMES_FILE = path.join(AUTH_DIR, 'names.json')

const app = express()
app.use(cors())
app.use(express.json({ limit: '15mb' }))

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

// ---- Multi-session registry ----
// id -> { id, name, status, qr, me, client, readyWatch }
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
  return [...sessions.values()].map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    qr: s.qr,
    me: s.me,
  }))
}
function emitSessions() {
  io.emit('sessions', publicSessions())
}

function puppeteerOpts() {
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
    ],
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
  // If the chip still has a default name, adopt the connected number.
  if (me && /^Chip /.test(s.name)) {
    s.name = pushname ? `${pushname}` : me
    saveNames()
  }
  console.log(`[wa:${s.id}] CONECTADO ✓ ${pushname ?? ''} (${me ?? '—'})`)
  emitSessions()
}

// Watchdog: promote to connected via getState() if the 'ready' event doesn't fire.
function startWatch(s) {
  if (s.readyWatch) return
  let tries = 0
  s.readyWatch = setInterval(async () => {
    tries++
    try {
      const st = await s.client.getState()
      if (st === 'CONNECTED') markConnected(s)
    } catch {
      /* ainda carregando */
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

  client.on('loading_screen', (percent, message) => {
    console.log(`[wa:${s.id}] carregando ${percent}% — ${message}`)
    s.status = 'authenticated'
    emitSessions()
  })

  client.on('change_state', (st) => {
    if (st === 'CONNECTED') markConnected(s)
  })

  client.on('authenticated', () => {
    console.log(`[wa:${s.id}] autenticado — sincronizando…`)
    s.status = 'authenticated'
    s.qr = null
    emitSessions()
    startWatch(s)
  })

  client.on('ready', () => markConnected(s))

  client.on('auth_failure', (m) => {
    console.error(`[wa:${s.id}] falha de autenticação:`, m)
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
  try {
    await s.client.logout()
  } catch {
    /* ignore */
  }
  try {
    await s.client.destroy()
  } catch {
    /* ignore */
  }
  sessions.delete(id)
  saveNames()
  emitSessions()
  // Remove auth folder so it doesn't auto-restore on next boot.
  try {
    fs.rmSync(path.join(AUTH_DIR, `session-${id}`), { recursive: true, force: true })
  } catch {
    /* ignore */
  }
}

// Restore previously connected chips on boot.
function restoreSessions() {
  const names = loadNames()
  let dirs = []
  try {
    dirs = fs
      .readdirSync(AUTH_DIR)
      .filter((d) => d.startsWith('session-'))
      .map((d) => d.replace('session-', ''))
  } catch {
    dirs = []
  }
  for (const id of dirs) {
    createSession(id, names[id] || `Chip ${id.slice(0, 4)}`)
  }
  if (dirs.length) console.log(`[wa] restaurando ${dirs.length} chip(s) salvos…`)
}

// ---- Socket ----
io.on('connection', (socket) => {
  socket.emit('sessions', publicSessions())
})

// ---- REST API ----
app.get('/api/sessions', (_req, res) => {
  res.json(publicSessions())
})

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

// Recreate the client for a session (keeps saved auth folder) to reconnect / get a fresh QR.
app.post('/api/sessions/:id/reconnect', async (req, res) => {
  const s = sessions.get(req.params.id)
  if (!s) return res.status(404).json({ ok: false, error: 'Chip não encontrado.' })
  const { id, name } = s
  stopWatch(s)
  try {
    await s.client.destroy()
  } catch {
    /* ignore */
  }
  sessions.delete(id)
  createSession(id, name) // reuses LocalAuth folder: reconecta se a sessão ainda for válida, senão gera QR
  res.json({ ok: true })
})

function toChatId(phone) {
  return String(phone).replace(/\D/g, '') + '@c.us'
}

function pickSession(sessionId) {
  if (sessionId) {
    const s = sessions.get(sessionId)
    if (s && s.status === 'connected') return s
  }
  const connected = [...sessions.values()].filter((s) => s.status === 'connected')
  if (!connected.length) return null
  return connected[Math.floor(Math.random() * connected.length)]
}

app.post('/api/send', async (req, res) => {
  const { sessionId, phone, message, imageBase64, caption } = req.body || {}
  if (!phone) return res.status(400).json({ ok: false, error: 'phone é obrigatório.' })

  const s = pickSession(sessionId)
  if (!s) return res.status(409).json({ ok: false, error: 'Nenhum chip conectado.' })

  try {
    const numberId = await s.client.getNumberId(toChatId(phone).replace('@c.us', ''))
    if (!numberId) {
      return res.status(422).json({ ok: false, error: 'Número não está no WhatsApp.', sessionId: s.id, chip: s.name })
    }

    if (imageBase64) {
      const m = imageBase64.match(/^data:(.+);base64,(.*)$/)
      const mimetype = m ? m[1] : 'image/jpeg'
      const data = m ? m[2] : imageBase64
      const media = new MessageMedia(mimetype, data, 'imagem')
      await s.client.sendMessage(numberId._serialized, media, { caption: caption || message || '' })
    } else {
      await s.client.sendMessage(numberId._serialized, message || '')
    }

    res.json({ ok: true, sessionId: s.id, chip: s.name })
  } catch (e) {
    console.error(`[wa:${s.id}] erro ao enviar:`, e?.message || e)
    res.status(500).json({ ok: false, error: e?.message || 'Erro ao enviar.', sessionId: s.id, chip: s.name })
  }
})

// Health monitor: detect chips that dropped (phone offline, unlinked, etc.).
// Requires 2 consecutive failures (~30s) before flagging, to avoid false positives.
setInterval(async () => {
  for (const s of sessions.values()) {
    if (s.status !== 'connected') continue
    let ok = false
    try {
      ok = (await s.client.getState()) === 'CONNECTED'
    } catch {
      ok = false
    }
    if (ok) {
      s.misses = 0
    } else {
      s.misses = (s.misses || 0) + 1
      if (s.misses >= 2) {
        console.warn(`[wa:${s.id}] queda detectada — marcando DESCONECTADO.`)
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
  console.log(`\n  UniquePulse backend (multi-chip) em http://localhost:${PORT}`)
  restoreSessions()
  if (!sessions.size) console.log('  Nenhum chip salvo. Adicione um chip pela dashboard.\n')
})
