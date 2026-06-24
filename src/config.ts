// Configuração da instância (login + marca).
// Para REPLICAR o painel para outra empresa, basta definir as variáveis VITE_* no
// ambiente do build (Render → Environment) — sem tocar no código. Sem elas, usa os
// padrões da Unique abaixo.

const env = import.meta.env

// Login simples do painel (autenticação no frontend — adequada para uso interno).
export const LOGIN_USER = (env.VITE_LOGIN_USER as string) || 'admin'
export const LOGIN_PASS = (env.VITE_LOGIN_PASS as string) || 'unique2026'

// Marca exibida no painel.
const NAME = (env.VITE_BRAND_NAME as string) || 'UniquePulse'
const HIGHLIGHT = (env.VITE_BRAND_HIGHLIGHT as string) || 'Pulse'
// Divide o nome em "parte normal" + "parte destacada" (em cor de destaque).
const lead = HIGHLIGHT && NAME.endsWith(HIGHLIGHT) ? NAME.slice(0, NAME.length - HIGHLIGHT.length) : NAME
const mark = HIGHLIGHT && NAME.endsWith(HIGHLIGHT) ? HIGHLIGHT : ''

export const BRAND = {
  name: NAME,
  lead,
  mark,
  tagline: (env.VITE_BRAND_TAGLINE as string) || 'Disparos WhatsApp — Unique Automóveis',
  logoIcon: (env.VITE_BRAND_LOGO_ICON as string) || '/logo-icon.png',
  logoFull: (env.VITE_BRAND_LOGO_FULL as string) || '/logo-full.png',
}
