import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { Upload, Trash2, RotateCcw, FileCheck2, UserPlus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { templateForPosition, TEMPLATE_COLORS } from '../utils/helpers'
import type { ContactStatus } from '../types'

const STATUS_LABEL: Record<ContactStatus, { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'bg-amber-500/15 text-amber-400' },
  sent: { label: 'Enviado', cls: 'bg-accent/15 text-accent' },
  error: { label: 'Erro', cls: 'bg-red-500/15 text-red-400' },
}

export default function Contacts() {
  const contacts = useStore((s) => s.contacts)
  const selected = useStore((s) => s.selected)
  const templates = useStore((s) => s.templates)
  const importContacts = useStore((s) => s.importContacts)
  const addContact = useStore((s) => s.addContact)
  const toggleSelect = useStore((s) => s.toggleSelect)
  const toggleSelectAll = useStore((s) => s.toggleSelectAll)
  const clearList = useStore((s) => s.clearList)
  const resetStatus = useStore((s) => s.resetStatus)
  const setPage = useStore((s) => s.setPage)

  const [dragOver, setDragOver] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [newNome, setNewNome] = useState('')
  const [newFone, setNewFone] = useState('')
  const [addErr, setAddErr] = useState(false)

  function handleAdd() {
    const ok = addContact(newNome, newFone)
    if (ok) {
      setNewNome('')
      setNewFone('')
      setAddErr(false)
    } else {
      setAddErr(true)
    }
  }

  const sent = contacts.filter((c) => c.status !== 'pending').length
  const progress = contacts.length ? Math.round((sent / contacts.length) * 100) : 0

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const rows = res.data
          .map((r) => ({
            nome: r.nome ?? r.name ?? '',
            telefone: r.telefone ?? r.phone ?? r.celular ?? '',
          }))
          .filter((r) => r.nome || r.telefone)
        const added = importContacts(rows)
        const rejected = rows.length - added
        setMsg(
          `${added} contato(s) importado(s)${rejected ? `, ${rejected} ignorado(s) (telefone inválido)` : ''}.`,
        )
        if (added > 0) {
          // Extra: auto-navigate to Disparo after import.
          setTimeout(() => setPage('disparo'), 1200)
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contatos</h2>
          <p className="text-sm text-ink/60">Importe um CSV com colunas <code>nome</code> e <code>telefone</code>.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => resetStatus()}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition hover:border-ink/30"
          >
            <RotateCcw size={15} /> Resetar status
          </button>
          <button
            onClick={() => clearList()}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20"
          >
            <Trash2 size={15} /> Limpar lista
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed p-8 text-center transition ${
          dragOver ? 'border-accent bg-accent/5' : 'border-border bg-card/40 hover:border-ink/30'
        }`}
      >
        <Upload size={28} className="mb-2 text-accent" />
        <p className="font-medium">Arraste seu CSV aqui ou clique para selecionar</p>
        <p className="mt-1 text-xs text-ink/50">Colunas aceitas: nome, telefone (com ou sem +55)</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
      </div>

      {msg && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm text-accent">
          <FileCheck2 size={16} /> {msg}
        </div>
      )}

      {/* Manual add — handy for testing with a single number */}
      <div className="rounded-card border border-border bg-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <UserPlus size={16} className="text-accent" /> Adicionar contato manualmente
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newNome}
            onChange={(e) => {
              setNewNome(e.target.value)
              setAddErr(false)
            }}
            placeholder="Nome"
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent"
          />
          <input
            value={newFone}
            onChange={(e) => {
              setNewFone(e.target.value)
              setAddErr(false)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Telefone (ex: 11999990000)"
            className={`flex-1 rounded-lg border bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent ${
              addErr ? 'border-red-500' : 'border-border'
            }`}
          />
          <button
            onClick={handleAdd}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
          >
            Adicionar
          </button>
        </div>
        {addErr && (
          <p className="mt-2 text-xs text-red-400">
            Nome obrigatório e telefone válido (DDD + número, com ou sem +55).
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="rounded-card border border-border bg-card p-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-ink/60">Progresso geral</span>
          <span className="font-semibold">
            {sent}/{contacts.length} ({progress}%)
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-bg">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink/50">
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  className="accent-[#e9b949]"
                  checked={contacts.length > 0 && selected.length === contacts.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-3">Nome</th>
              <th className="p-3">Telefone</th>
              <th className="p-3">Status</th>
              <th className="p-3">Template usado</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-ink/40">
                  Nenhum contato. Importe um CSV para começar.
                </td>
              </tr>
            )}
            {contacts.map((c, i) => {
              const tIdx = c.templateUsed ?? templateForPosition(i, templates)
              return (
                <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      className="accent-[#e9b949]"
                      checked={selected.includes(c.id)}
                      onChange={() => toggleSelect(c.id)}
                    />
                  </td>
                  <td className="p-3 font-medium">{c.nome}</td>
                  <td className="p-3 font-mono text-ink/70">{c.telefone}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_LABEL[c.status].cls}`}>
                      {STATUS_LABEL[c.status].label}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className="rounded px-2 py-0.5 text-xs font-bold text-white"
                      style={{ background: TEMPLATE_COLORS[tIdx] }}
                      title={templates[tIdx]?.name}
                    >
                      T{tIdx + 1}
                    </span>
                    <span className="ml-2 text-xs text-ink/40">
                      {c.templateUsed === null ? '(previsto)' : ''}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
