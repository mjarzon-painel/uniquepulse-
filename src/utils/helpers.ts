import type { Template } from '../types'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/** Validate a Brazilian phone: optional +55, DDD (2 digits) + 8 or 9 digits. */
export function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  // With country code 55
  if (digits.length === 12 || digits.length === 13) {
    return digits.startsWith('55')
  }
  // Without country code: DDD (2) + number (8 or 9)
  return digits.length === 10 || digits.length === 11
}

/** Normalize to +55DDDXXXXXXXXX display form. */
export function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits
  }
  return '+' + digits
}

export function nowTime(): string {
  const d = new Date()
  return d.toLocaleTimeString('pt-BR', { hour12: false })
}

export function nowDateTime(): string {
  const d = new Date()
  return d.toLocaleString('pt-BR', { hour12: false })
}

/** A template is considered "filled" if it has text or an image. */
export function isFilled(t: Template): boolean {
  return t.text.trim().length > 0 || !!t.image
}

/** Indexes of filled templates, in order. Falls back to [0] if none filled. */
export function filledTemplateIds(templates: Template[]): number[] {
  const filled = templates.filter(isFilled).map((t) => t.id)
  return filled.length ? filled : [templates[0]?.id ?? 0]
}

/** Which template (index 0..2) will be used for the contact at queue position `pos`. */
export function templateForPosition(pos: number, templates: Template[]): number {
  const ids = filledTemplateIds(templates)
  return ids[pos % ids.length]
}

/** Replace {{nome}} with the contact name. */
export function personalize(text: string, nome: string): string {
  return text.replace(/\{\{\s*nome\s*\}\}/gi, nome)
}

/** Random delay (ms) between min and max minutes — keeps the cadence human, not robotic. */
export function randomIntervalMs(minMinutes: number, maxMinutes: number): number {
  const lo = Math.min(minMinutes, maxMinutes)
  const hi = Math.max(minMinutes, maxMinutes)
  const minutes = lo + Math.random() * (hi - lo)
  return Math.round(minutes * 60_000)
}

/** Format milliseconds as MM:SS. */
export function msToClock(ms: number): string {
  const secs = Math.max(0, Math.round(ms / 1000))
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

/** Are we inside business hours (Mon–Fri, 08:00–18:00)? */
export function isWithinBusinessHours(d = new Date()): boolean {
  const day = d.getDay() // 0 Sun .. 6 Sat
  const hour = d.getHours()
  return day >= 1 && day <= 5 && hour >= 8 && hour < 18
}

export const TEMPLATE_COLORS = ['#3583ff', '#e9b949', '#5aa0ff']
export const TEMPLATE_LABELS = ['T1', 'T2', 'T3']
export const TEMPLATE_CLASSES = ['t1', 't2', 't3']
