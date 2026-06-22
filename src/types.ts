export type ContactStatus = 'pending' | 'sent' | 'error'

export interface Contact {
  id: string
  nome: string
  telefone: string
  status: ContactStatus
  templateUsed: number | null // index of template actually used (0..2)
}

export interface Template {
  id: number // 0, 1, 2
  name: string
  text: string
  image: string | null // base64 data URL
  caption: string
}

export type DispatchState = 'stopped' | 'running' | 'paused'
export type OrderMode = 'sequential' | 'random'

export interface Settings {
  intervalMin: number // intervalo mínimo (minutos)
  intervalMax: number // intervalo máximo (minutos) — o tempo de cada envio é sorteado nessa faixa
  businessHours: boolean
  order: OrderMode
}

export interface LogLine {
  id: string
  time: string // HH:MM:SS
  kind: 'success' | 'error' | 'info'
  text: string
}

export interface HistoryEntry {
  id: string
  datetime: string // full pt-BR date/time
  ts: number
  nome: string
  telefone: string
  template: number // 0..2
  status: 'sent' | 'error'
  preview: string
  chip?: string // nome do chip que enviou
}

export type Page = 'dashboard' | 'contacts' | 'templates' | 'disparo' | 'historico' | 'conexoes'
