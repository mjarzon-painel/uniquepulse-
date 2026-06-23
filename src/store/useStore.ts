import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Contact,
  DispatchState,
  HistoryEntry,
  LogLine,
  Page,
  Settings,
  Template,
} from '../types'
import { formatPhone, isValidPhone } from '../utils/helpers'
import { sendAction, type ChipSession } from '../utils/api'
import { LOGIN_USER, LOGIN_PASS } from '../config'

// Templates iniciais (só para a primeira renderização; o backend manda os reais ao conectar).
const DEFAULT_TEMPLATES: Template[] = [
  { id: 0, name: 'Oferta Direta', text: '', image: null, caption: '' },
  { id: 1, name: 'Abordagem Consultiva', text: '', image: null, caption: '' },
  { id: 2, name: 'Urgência', text: '', image: null, caption: '' },
]

// Flags para não sobrescrever edições locais (template/settings) enquanto o envio ao backend está pendente.
let pendingTemplate = false
let pendingSettings = false
let tmplTimer: ReturnType<typeof setTimeout> | undefined
let setTimer: ReturnType<typeof setTimeout> | undefined
let lastTmplId = 0

export interface ApiConfig {
  token: string
  phoneId: string
  waba: string
  template: string
  lang: string
  imageUrl: string
}

/** Estado compartilhado vindo do backend. */
interface AppStatePayload {
  contacts: Contact[]
  templates: Template[]
  settings: Settings
  dispatchChips: string[]
  sendMode: 'chip' | 'api'
  api: ApiConfig
  dispatch: DispatchState
  queue: string[]
  queuePos: number
  chipCursor: number
  nextSendAt: number | null
  currentIntervalMs: number
  sending: boolean
  log: LogLine[]
  history: HistoryEntry[]
  showCompletion: boolean
}

interface State extends AppStatePayload {
  authed: boolean
  login: (user: string, pass: string) => boolean
  logout: () => void
  page: Page
  connected: boolean
  sessions: ChipSession[]
  selected: string[]

  setAppState: (s: AppStatePayload) => void
  setSessions: (sessions: ChipSession[]) => void

  setPage: (p: Page) => void
  toggleDispatchChip: (id: string) => void
  setSendMode: (mode: 'chip' | 'api') => void
  updateApi: (patch: Partial<ApiConfig>) => void
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
  resetCampaign: () => void
  closeCompletion: () => void
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      // ---- shared (backend) ----
      contacts: [],
      templates: DEFAULT_TEMPLATES,
      settings: { intervalMin: 8, intervalMax: 15, businessHours: false, order: 'sequential' },
      dispatchChips: [],
      sendMode: 'chip',
      api: { token: '', phoneId: '', waba: '', template: '', lang: 'pt_BR', imageUrl: '' },
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

      // ---- local ----
      authed: false,
      page: 'dashboard',
      connected: false,
      sessions: [],
      selected: [],

      login: (user, pass) => {
        const ok = user.trim().toLowerCase() === LOGIN_USER.toLowerCase() && pass === LOGIN_PASS
        if (ok) set({ authed: true })
        return ok
      },
      logout: () => set({ authed: false }),

      // Recebe o estado autoritativo do servidor (ao vivo, para todos os aparelhos).
      setAppState: (s) => {
        const patch: Partial<State> = {
          contacts: s.contacts,
          dispatchChips: s.dispatchChips,
          sendMode: s.sendMode,
          api: s.api,
          dispatch: s.dispatch,
          queue: s.queue,
          queuePos: s.queuePos,
          chipCursor: s.chipCursor,
          nextSendAt: s.nextSendAt,
          currentIntervalMs: s.currentIntervalMs,
          sending: s.sending,
          log: s.log,
          history: s.history,
          showCompletion: s.showCompletion,
        }
        // Não sobrescreve edições locais pendentes de template/settings.
        if (!pendingTemplate) patch.templates = s.templates
        if (!pendingSettings) patch.settings = s.settings
        set(patch)
      },

      setSessions: (sessions) =>
        set({ sessions, connected: sessions.some((s) => s.status === 'connected') }),

      setPage: (p) => set({ page: p }),

      toggleDispatchChip: (id) => sendAction('toggleDispatchChip', { id }),
      setSendMode: (mode) => sendAction('setSendMode', { mode }),
      updateApi: (patch) => sendAction('updateApi', { patch }),

      importContacts: (rows) => {
        // Conta quantos serão realmente adicionados (válidos e não duplicados), para a mensagem.
        const seen = new Set(get().contacts.map((c) => formatPhone(c.telefone)))
        let added = 0
        for (const r of rows) {
          const tel = (r.telefone || '').trim()
          if (!tel || !isValidPhone(tel)) continue
          const norm = formatPhone(tel)
          if (seen.has(norm)) continue
          seen.add(norm)
          added++
        }
        sendAction('importContacts', { rows })
        return added
      },

      addContact: (nome, telefone) => {
        if (!isValidPhone(telefone.trim())) return false
        sendAction('addContact', { nome, telefone })
        return true
      },

      toggleSelect: (id) => {
        const sel = get().selected
        set({ selected: sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id] })
      },
      toggleSelectAll: () => {
        const { contacts, selected } = get()
        set({ selected: selected.length === contacts.length ? [] : contacts.map((c) => c.id) })
      },

      clearList: () => {
        set({ selected: [] })
        sendAction('clearList')
      },
      resetStatus: () => sendAction('resetStatus'),

      // Edição de template: otimista local + envio com debounce (não trava a digitação).
      updateTemplate: (id, patch) => {
        pendingTemplate = true
        lastTmplId = id
        set({ templates: get().templates.map((t) => (t.id === id ? { ...t, ...patch } : t)) })
        clearTimeout(tmplTimer)
        tmplTimer = setTimeout(() => {
          const full = get().templates.find((t) => t.id === lastTmplId)
          sendAction('updateTemplate', { id: lastTmplId, patch: full })
          pendingTemplate = false
        }, 500)
      },

      updateSettings: (patch) => {
        pendingSettings = true
        set({ settings: { ...get().settings, ...patch } })
        clearTimeout(setTimer)
        setTimer = setTimeout(() => {
          sendAction('updateSettings', { patch: get().settings })
          pendingSettings = false
        }, 400)
      },

      start: () => sendAction('start'),
      pause: () => sendAction('pause'),
      stop: () => sendAction('stop'),
      resetCampaign: () => sendAction('resetCampaign'),
      closeCompletion: () => sendAction('closeCompletion'),
    }),
    {
      name: 'wa-blast-store',
      version: 3,
      // Só guarda login e página no navegador. Os dados (contatos, disparo...) vêm do servidor.
      partialize: (s) => ({ authed: s.authed, page: s.page }),
    },
  ),
)
