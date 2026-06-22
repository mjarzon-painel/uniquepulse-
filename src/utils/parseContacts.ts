import Papa from 'papaparse'

export interface RawContact {
  nome: string
  telefone: string
}

// Palavras-chave para reconhecer cabeçalhos de colunas.
const NAME_HEADERS = ['nome', 'name', 'cliente', 'contato', 'contact', 'razao', 'razão', 'lead', 'pessoa', 'apelido']
const PHONE_HEADERS = [
  'telefone', 'phone', 'celular', 'cel', 'fone', 'whatsapp', 'wpp', 'zap',
  'numero', 'número', 'number', 'tel', 'mobile', 'movel', 'móvel', 'ddd',
]

function digits(s: string): string {
  return (s || '').replace(/\D/g, '')
}

/** Heurística (mais estrita) para detectar coluna de telefone. */
export function looksLikePhone(s: string): boolean {
  const d = digits(s)
  if (d.length === 12 || d.length === 13) return d.startsWith('55')
  if (d.length === 10 || d.length === 11) {
    const ddd = parseInt(d.slice(0, 2), 10)
    return ddd >= 11 && ddd <= 99 // DDDs brasileiros válidos
  }
  return false
}

function looksLikeName(s: string): boolean {
  const t = (s || '').trim()
  if (!t) return false
  // Tem letras e não é predominantemente dígitos.
  return /[a-zA-ZÀ-ÿ]{2,}/.test(t) && digits(t).length < t.replace(/\s/g, '').length
}

function cleanName(s: string): string {
  return (s || '')
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Separa "João - (11) 99999-9999" em nome + telefone. */
function splitNameAndPhone(text: string): RawContact | null {
  const s = (text || '').trim()
  if (!s) return null
  const m = s.match(/\+?\d[\d\s().-]{8,}\d/)
  if (!m) return null
  const telefone = m[0]
  if (!looksLikePhone(telefone)) return null
  const nome = cleanName(s.replace(m[0], ' ').replace(/[-–—:,;|]+/g, ' '))
  return { nome, telefone }
}

/** Núcleo: recebe linhas (matriz de células) e separa nome/telefone. */
function extractFromRows(rawRows: string[][]): RawContact[] {
  const rows = rawRows
    .map((r) => (r || []).map((c) => (c ?? '').toString()))
    .filter((r) => r.some((c) => c.trim() !== ''))
  if (!rows.length) return []

  // 1) Detecta cabeçalho por palavras-chave.
  const first = rows[0].map((c) => c.trim().toLowerCase())
  let nameCol = -1
  let phoneCol = -1
  first.forEach((h, i) => {
    if (phoneCol < 0 && PHONE_HEADERS.some((k) => h.includes(k))) phoneCol = i
    if (nameCol < 0 && NAME_HEADERS.some((k) => h === k || h.includes(k))) nameCol = i
  })
  const hasHeader = nameCol >= 0 || phoneCol >= 0
  const dataRows = hasHeader ? rows.slice(1) : rows

  // 2) Se o cabeçalho não definiu, detecta pela conteúdo das colunas.
  if (phoneCol < 0 || nameCol < 0) {
    const colCount = Math.max(...dataRows.map((r) => r.length), 0)
    const score: { phone: number; name: number }[] = []
    for (let c = 0; c < colCount; c++) {
      let p = 0
      let n = 0
      let tot = 0
      for (const r of dataRows) {
        const v = (r[c] ?? '').toString()
        if (!v.trim()) continue
        tot++
        if (looksLikePhone(v)) p++
        else if (looksLikeName(v)) n++
      }
      score[c] = { phone: tot ? p / tot : 0, name: tot ? n / tot : 0 }
    }
    if (phoneCol < 0) {
      let best = -1
      let bv = 0.4
      score.forEach((s, i) => {
        if (s.phone > bv) {
          bv = s.phone
          best = i
        }
      })
      phoneCol = best
    }
    if (nameCol < 0) {
      let best = -1
      let bv = 0.4
      score.forEach((s, i) => {
        if (i === phoneCol) return
        if (s.name > bv) {
          bv = s.name
          best = i
        }
      })
      nameCol = best
    }
  }

  const out: RawContact[] = []
  dataRows.forEach((cells, idx) => {
    let telefone = ''
    let nome = ''

    if (phoneCol >= 0 && looksLikePhone(cells[phoneCol] || '')) telefone = cells[phoneCol]
    if (nameCol >= 0 && nameCol !== phoneCol) nome = cleanName(cells[nameCol] || '')

    // Telefone em qualquer célula da linha.
    if (!telefone) {
      const c = cells.find((x) => looksLikePhone(x))
      if (c) telefone = c
    }
    // Nome + telefone juntos numa célula.
    if (!telefone) {
      for (const c of cells) {
        const sp = splitNameAndPhone(c)
        if (sp) {
          telefone = sp.telefone
          if (!nome) nome = sp.nome
          break
        }
      }
    }
    if (!telefone) return // linha sem telefone válido — ignora

    // Nome: qualquer célula com texto que não seja o telefone.
    if (!nome) {
      const c = cells.find((x) => looksLikeName(x) && !looksLikePhone(x))
      if (c) nome = cleanName(c)
    }
    // Nome a partir da célula combinada.
    if (!nome) {
      const sp = splitNameAndPhone(cells.find((x) => looksLikePhone(x)) || '')
      if (sp?.nome) nome = sp.nome
    }
    if (!nome) nome = `Contato ${idx + 1}`

    out.push({ nome, telefone })
  })

  return dedupe(out)
}

function dedupe(list: RawContact[]): RawContact[] {
  const seen = new Set<string>()
  const out: RawContact[] = []
  for (const c of list) {
    let d = digits(c.telefone)
    if (d.length <= 11) d = '55' + d // chave normalizada
    if (seen.has(d)) continue
    seen.add(d)
    out.push(c)
  }
  return out
}

function parseVcf(text: string): RawContact[] {
  const out: RawContact[] = []
  for (const card of text.split(/END:VCARD/i)) {
    const tel = card.match(/\bTEL[^:]*:(.+)/i)?.[1]?.trim()
    if (!tel || !looksLikePhone(tel)) continue
    const fn = card.match(/\bFN[^:]*:(.+)/i)?.[1]?.trim()
    const n = card.match(/^N[^:]*:(.+)/im)?.[1]?.trim()
    const nome = cleanName(fn || (n ? n.split(';').filter(Boolean).reverse().join(' ') : ''))
    out.push({ nome: nome || '', telefone: tel })
  }
  return dedupe(out)
}

/** Analisa qualquer arquivo de lista de contatos e retorna pares nome/telefone. */
export async function parseContactFile(file: File): Promise<RawContact[]> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.vcf')) {
    return parseVcf(await file.text())
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx') // carregado sob demanda (code-splitting)
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as unknown[][]
    return extractFromRows(rows.map((r) => r.map((c) => (c ?? '').toString())))
  }

  // CSV / TSV / TXT — detecta delimitador automaticamente.
  const text = await file.text()
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true })
  return extractFromRows(parsed.data as unknown as string[][])
}
