import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Contact,
  ContactStatus,
  DispatchState,
  HistoryEntry,
  LogLine,
  Page,
  Settings,
  Template,
} from '../types'
import {
  filledTemplateIds,
  formatPhone,
  isValidPhone,
  isWithinBusinessHours,
  msToClock,
  nowDateTime,
  nowTime,
  personalize,
  randomIntervalMs,
  templateForPosition,
  uid,
} from '../utils/helpers'
import { sendMessage } from '../utils/api'

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 0,
    name: 'Oferta Direta',
    text: 'Olá {{nome}}! 🚗 Temos uma oferta imperdível esperando por você. Condições especiais com entrada facilitada. Quer saber mais?',
    image: null,
    caption: 'Oferta especial para você, {{nome}}!',
  },
  {
    id: 1,
    name: 'Abordagem Consultiva',
    text: 'Oi {{nome}}, tudo bem? Sou consultor da loja e gostaria de entender o que você procura para te ajudar a encontrar o carro ideal. Posso te fazer algumas perguntas?',
    image: null,
    caption: 'Estamos aqui para te ajudar, {{nome}}.',
  },
  {
    id: 2,
    name: 'Urgência',
    text: '⏰ {{nome}}, últimas unidades com esse preço! A promoção acaba hoje. Garanta já o seu antes que esgote!',
    image: null,
    caption: 'Corre, {{nome}}! Acaba hoje.',
  },
]

const EXAMPLE_CONTACTS: Contact[] = [
  { id: uid(), nome: 'Maria Souza', telefone: '+5511999990000', status: 'pending', templateUsed: null },
  { id: uid(), nome: 'João Silva', telefone: '+5511999990001', status: 'pending', templateUsed: null },
  { id: uid(), nome: 'Pedro Lima', telefone: '+5511999990002', status: 'pending', templateUsed: null },
  { id: uid(), nome: 'Ana Costa', telefone: '+5511999990003', status: 'pending', templateUsed: null },
  { id: uid(), nome: 'Carla Dias', telefone: '+5521988887777', status: 'pending', templateUsed: null },
]

interface State {
  page: Page
  connected: boolean
  contacts: Contact[]
  selected: string[]
  templates: Template[]
  settings: Settings
  dispatch: DispatchState
  queue: string[]
  queuePos: number
  nextSendAt: number | null
  currentIntervalMs: number // duração do ciclo atual (sorteado) — usado no countdown
  sending: boolean
  log: LogLine[]
  history: HistoryEntry[]
  showCompletion: boolean

  setPage: (p: Page) => void
  setConnected: (b: boolean) => void

  importContacts: (rows: { nome: string; telefone: string }[]) => number
  addContact: (nome: string, telefone: string) => boolean
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  clearList: () => void
  resetStatus: () => void

  updateTemplate: (id: number, patch: Partial<Template>) => void
  updateSettings: (patch: Partial<Settings>) => void

  start: () => void
  pause: () => void
  stop: () => void
  tick: () => void
  processNext: () => Promise<void>
  resetCampaign: () => void
  closeCompletion: () => void
}

function pushLog(log: LogLine[], line: Omit<LogLine, 'id' | 'time'>): LogLine[] {
  const entry: LogLine = { id: uid(), time: nowTime(), ...line }
  return [...log, entry].slice(-30)
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      page: 'dashboard',
      connected: false,
      contacts: EXAMPLE_CONTACTS,
      selected: [],
      templates: DEFAULT_TEMPLATES,
      settings: { intervalMin: 8, intervalMax: 15, businessHours: false, order: 'sequential' },
      dispatch: 'stopped',
      queue: [],
      queuePos: 0,
      nextSendAt: null,
      currentIntervalMs: 0,
      sending: false,
      log: [],
      history: [],
      showCompletion: false,

      setPage: (p) => set({ page: p }),

      setConnected: (b) => {
        if (get().connected === b) return
        set({ connected: b })
        // If WhatsApp drops while running, pause the dispatch.
        if (!b && get().dispatch === 'running') {
          set({
            dispatch: 'paused',
            nextSendAt: null,
            log: pushLog(get().log, {
              kind: 'error',
              text: '🔌 WhatsApp desconectado — disparo pausado.',
            }),
          })
        }
      },

      importContacts: (rows) => {
        const valid: Contact[] = []
        for (const r of rows) {
          const nome = (r.nome || '').trim()
          const telefone = (r.telefone || '').trim()
          if (!nome || !telefone) continue
          if (!isValidPhone(telefone)) continue
          valid.push({
            id: uid(),
            nome,
            telefone: formatPhone(telefone),
            status: 'pending',
            templateUsed: null,
          })
        }
        if (valid.length) {
          set({ contacts: [...get().contacts, ...valid] })
        }
        return valid.length
      },

      addContact: (nome, telefone) => {
        const n = nome.trim()
        const t = telefone.trim()
        if (!n || !isValidPhone(t)) return false
        const contact: Contact = {
          id: uid(),
          nome: n,
          telefone: formatPhone(t),
          status: 'pending',
          templateUsed: null,
        }
        set({ contacts: [...get().contacts, contact] })
        return true
      },

      toggleSelect: (id) => {
        const sel = get().selected
        set({
          selected: sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id],
        })
      },

      toggleSelectAll: () => {
        const { contacts, selected } = get()
        set({ selected: selected.length === contacts.length ? [] : contacts.map((c) => c.id) })
      },

      clearList: () =>
        set({
          contacts: [],
          selected: [],
          dispatch: 'stopped',
          queue: [],
          queuePos: 0,
          nextSendAt: null,
        }),

      resetStatus: () =>
        set({
          contacts: get().contacts.map((c) => ({ ...c, status: 'pending', templateUsed: null })),
          dispatch: 'stopped',
          queue: [],
          queuePos: 0,
          nextSendAt: null,
        }),

      updateTemplate: (id, patch) =>
        set({
          templates: get().templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }),

      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      start: () => {
        const { contacts, settings, dispatch, queue, queuePos } = get()
        // Resume from pause keeps queue/pos.
        if (dispatch === 'paused' && queue.length) {
          const iv = randomIntervalMs(settings.intervalMin, settings.intervalMax)
          set({
            dispatch: 'running',
            nextSendAt: Date.now() + iv,
            currentIntervalMs: iv,
            log: pushLog(get().log, {
              kind: 'info',
              text: `▶️ Disparo retomado — próximo em ${msToClock(iv)}.`,
            }),
          })
          return
        }
        // Fresh start: build queue from pending contacts.
        let pending = contacts.filter((c) => c.status === 'pending').map((c) => c.id)
        if (!pending.length) {
          set({ log: pushLog(get().log, { kind: 'info', text: '⚠️ Nenhum contato pendente para disparar.' }) })
          return
        }
        if (settings.order === 'random') {
          pending = [...pending]
          for (let i = pending.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[pending[i], pending[j]] = [pending[j], pending[i]]
          }
        }
        const iv = randomIntervalMs(settings.intervalMin, settings.intervalMax)
        set({
          dispatch: 'running',
          queue: pending,
          queuePos: 0,
          nextSendAt: Date.now() + iv,
          currentIntervalMs: iv,
          log: pushLog(get().log, {
            kind: 'info',
            text: `🚀 Campanha iniciada — ${pending.length} contato(s). Intervalo variável de ${settings.intervalMin}–${settings.intervalMax} min. Próximo em ${msToClock(iv)}.`,
          }),
        })
      },

      pause: () => {
        if (get().dispatch !== 'running') return
        set({
          dispatch: 'paused',
          nextSendAt: null,
          log: pushLog(get().log, { kind: 'info', text: '⏸️ Disparo pausado.' }),
        })
      },

      stop: () => {
        set({
          dispatch: 'stopped',
          queue: [],
          queuePos: 0,
          nextSendAt: null,
          log: pushLog(get().log, { kind: 'info', text: '⏹️ Disparo parado.' }),
        })
      },

      tick: () => {
        const s = get()
        if (s.dispatch !== 'running' || s.sending || s.nextSendAt == null) return
        if (Date.now() < s.nextSendAt) return
        if (s.settings.businessHours && !isWithinBusinessHours()) return
        void get().processNext()
      },

      // Sends the current contact for real via the backend, then schedules the next.
      processNext: async () => {
        const s = get()
        const { queue, queuePos, contacts, templates, settings } = s

        if (queuePos >= queue.length) {
          set({ dispatch: 'stopped', nextSendAt: null, sending: false, showCompletion: true })
          return
        }

        const id = queue[queuePos]
        const contact = contacts.find((c) => c.id === id)
        if (!contact) {
          set({ queuePos: queuePos + 1 })
          return
        }

        const tIdx = templateForPosition(queuePos, templates)
        const tmpl = templates.find((t) => t.id === tIdx) ?? templates[0]
        const tLabel = `Template ${tIdx + 1}`
        const msg = personalize(tmpl.text, contact.nome)
        const caption = personalize(tmpl.caption, contact.nome)

        // Lock so the 1s ticker doesn't fire again while the request is in flight.
        set({
          sending: true,
          nextSendAt: null,
          log: pushLog(s.log, {
            kind: 'info',
            text: `📤 Enviando ${tLabel} → ${contact.nome} (${contact.telefone})…`,
          }),
        })

        const res = await sendMessage({
          phone: contact.telefone,
          message: msg,
          imageBase64: tmpl.image,
          caption,
        })

        const cur = get()
        const success = res.ok
        const newStatus: ContactStatus = success ? 'sent' : 'error'
        const newContacts = cur.contacts.map((c) =>
          c.id === id ? { ...c, status: newStatus, templateUsed: tIdx } : c,
        )

        const hist: HistoryEntry = {
          id: uid(),
          datetime: nowDateTime(),
          ts: Date.now(),
          nome: contact.nome,
          telefone: contact.telefone,
          template: tIdx,
          status: success ? 'sent' : 'error',
          preview: msg.slice(0, 120),
        }

        let log = cur.log
        if (success) {
          log = pushLog(log, {
            kind: 'success',
            text: `✅ ${tLabel} → ${contact.nome} (${contact.telefone})`,
          })
        } else {
          log = pushLog(log, {
            kind: 'error',
            text: `❌ Falha ao enviar para ${contact.nome} — ${res.error ?? 'erro desconhecido'}`,
          })
        }

        const nextPos = queuePos + 1
        const finished = nextPos >= queue.length
        const wasRunning = cur.dispatch === 'running'

        let nextSendAt: number | null = null
        let nextIntervalMs = cur.currentIntervalMs
        let newDispatch = cur.dispatch
        if (finished) {
          newDispatch = 'stopped'
        } else if (wasRunning) {
          nextIntervalMs = randomIntervalMs(settings.intervalMin, settings.intervalMax)
          nextSendAt = Date.now() + nextIntervalMs
          const nextContact = newContacts.find((c) => c.id === queue[nextPos])
          const nextT = templateForPosition(nextPos, templates) + 1
          log = pushLog(log, {
            kind: 'info',
            text: `⏳ Próximo envio em ${msToClock(nextIntervalMs)} → ${nextContact?.nome ?? '—'} — Template ${nextT}`,
          })
        }

        set({
          contacts: newContacts,
          history: [hist, ...cur.history],
          log,
          queuePos: nextPos,
          nextSendAt,
          currentIntervalMs: nextIntervalMs,
          sending: false,
          dispatch: newDispatch,
          showCompletion: finished ? true : cur.showCompletion,
        })
      },

      resetCampaign: () =>
        set({
          contacts: get().contacts.map((c) => ({ ...c, status: 'pending', templateUsed: null })),
          dispatch: 'stopped',
          queue: [],
          queuePos: 0,
          nextSendAt: null,
          showCompletion: false,
          log: [],
        }),

      closeCompletion: () => set({ showCompletion: false }),
    }),
    {
      name: 'wa-blast-store',
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // If a dispatch was running, come back paused (spec).
        if (state.dispatch === 'running') {
          state.dispatch = 'paused'
          state.nextSendAt = null
        }
        state.showCompletion = false
        state.sending = false
        // Connection is owned by the backend — re-sync on load, never trust storage.
        state.connected = false
        // Migrate older saved state that had no variable-interval fields.
        if (state.settings && typeof state.settings.intervalMax !== 'number') {
          const base = typeof state.settings.intervalMin === 'number' ? state.settings.intervalMin : 8
          state.settings.intervalMin = base
          state.settings.intervalMax = Math.max(base + 5, base)
        }
        if (typeof state.currentIntervalMs !== 'number') state.currentIntervalMs = 0
      },
    },
  ),
)
