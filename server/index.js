import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import qrcode from 'qrcode'
import pkg from 'whatsapp-web.js'

const { Client, LocalAuth, MessageMedia } = pkg

const PORT = 3001

const app = express()
app.use(cors())
app.use(express.json({ limit: '15mb' })) // allow base64 images

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

// ---- WhatsApp state ----
let state = {
  status: 'disconnected', // disconnected | qr | authenticated | connected
  qr: null, // data URL of current QR
  me: null, // { number, pushname }
}

function setState(patch) {
  state = { ...state, ...patch }
  io.emit('state', publicState())
}

function publicState() {
  return { status: state.status, qr: state.qr, me: state.me }
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
    ],
  },
})

function markConnected() {
  if (readyWatch) {
    clearInterval(readyWatch)
    readyWatch = null
  }
  const me = client.info?.wid?.user ?? null
  const pushname = client.info?.pushname ?? null
  console.log(`[wa] CONECTADO ✓ ${pushname ?? ''} (${me ?? '—'})`)
  setState({ status: 'connected', qr: null, me: { number: me, pushname } })
}

// Watchdog: some accounts authenticate but the 'ready' event never fires.
// We poll the real connection state and promote to "connected" when it reports CONNECTED.
let readyWatch = null
function startReadyWatchdog() {
  if (readyWatch) return
  let tries = 0
  readyWatch = setInterval(async () => {
    tries++
    try {
      const st = await client.getState()
      console.log(`[wa] verificando estado (${tries}): ${st}`)
      if (st === 'CONNECTED') {
        markConnected()
      }
    } catch (e) {
      console.log(`[wa] verificando estado (${tries}): ainda carregando…`)
    }
    if (tries >= 60 && readyWatch) {
      clearInterval(readyWatch)
      readyWatch = null
      console.warn('[wa] watchdog expirou (3 min) sem CONNECTED.')
    }
  }, 3000)
}

client.on('qr', async (qr) => {
  try {
    const dataUrl = await qrcode.toDataURL(qr, { margin: 1, width: 320 })
    console.log('[wa] QR gerado — escaneie no app.')
    setState({ status: 'qr', qr: dataUrl })
  } catch (e) {
    console.error('[wa] erro ao gerar QR', e)
  }
})

client.on('loading_screen', (percent, message) => {
  console.log(`[wa] carregando ${percent}% — ${message}`)
  setState({ status: 'authenticated' })
})

client.on('change_state', (s) => {
  console.log('[wa] mudança de estado:', s)
  if (s === 'CONNECTED') markConnected()
})

client.on('authenticated', () => {
  console.log('[wa] autenticado — sincronizando…')
  setState({ status: 'authenticated', qr: null })
  startReadyWatchdog()
})

client.on('ready', () => {
  markConnected()
})

client.on('auth_failure', (m) => {
  console.error('[wa] falha de autenticação:', m)
  setState({ status: 'disconnected', qr: null, me: null })
})

client.on('disconnected', (reason) => {
  console.warn('[wa] desconectado:', reason)
  if (readyWatch) {
    clearInterval(readyWatch)
    readyWatch = null
  }
  setState({ status: 'disconnected', qr: null, me: null })
  // NOTE: não reinicializamos automaticamente para evitar loop de autenticação.
  // Use o botão Conectar / endpoint /api/logout para gerar um novo QR.
})

client.initialize().catch((e) => console.error('[wa] initialize falhou', e))

// ---- Socket ----
io.on('connection', (socket) => {
  socket.emit('state', publicState())
})

// ---- REST API ----
app.get('/api/status', (_req, res) => {
  res.json(publicState())
})

// Force a fresh session (logout + new QR)
app.post('/api/logout', async (_req, res) => {
  try {
    await client.logout()
  } catch (e) {
    // ignore
  }
  setState({ status: 'disconnected', qr: null, me: null })
  client.initialize().catch(() => {})
  res.json({ ok: true })
})

function toChatId(phone) {
  const digits = String(phone).replace(/\D/g, '')
  return `${digits}@c.us`
}

app.post('/api/send', async (req, res) => {
  if (state.status !== 'connected') {
    return res.status(409).json({ ok: false, error: 'WhatsApp não está conectado.' })
  }
  const { phone, message, imageBase64, caption } = req.body || {}
  if (!phone) return res.status(400).json({ ok: false, error: 'phone é obrigatório.' })

  try {
    const chatId = toChatId(phone)

    // Verify the number is on WhatsApp
    const numberId = await client.getNumberId(chatId.replace('@c.us', ''))
    if (!numberId) {
      return res.status(422).json({ ok: false, error: 'Número não está no WhatsApp.' })
    }

    if (imageBase64) {
      const m = imageBase64.match(/^data:(.+);base64,(.*)$/)
      const mimetype = m ? m[1] : 'image/jpeg'
      const data = m ? m[2] : imageBase64
      const media = new MessageMedia(mimetype, data, 'imagem')
      await client.sendMessage(numberId._serialized, media, {
        caption: caption || message || '',
      })
    } else {
      await client.sendMessage(numberId._serialized, message || '')
    }

    res.json({ ok: true })
  } catch (e) {
    console.error('[wa] erro ao enviar:', e?.message || e)
    res.status(500).json({ ok: false, error: e?.message || 'Erro ao enviar.' })
  }
})

httpServer.listen(PORT, () => {
  console.log(`\n  WA Blast backend rodando em http://localhost:${PORT}`)
  console.log('  Aguardando QR Code... (abra a dashboard e clique em Conectar)\n')
})
