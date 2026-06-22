import { useRef, useState } from 'react'
import { ImagePlus, Save, X, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import WhatsAppBubble from '../components/WhatsAppBubble'
import { isFilled, personalize, TEMPLATE_COLORS } from '../utils/helpers'

export default function Templates() {
  const templates = useStore((s) => s.templates)
  const updateTemplate = useStore((s) => s.updateTemplate)

  const [active, setActive] = useState(0)
  const [typingKey, setTypingKey] = useState<number | undefined>(undefined)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const t = templates[active]
  const previewName = 'João' // sample name for {{nome}} substitution

  function onImage(file: File) {
    const reader = new FileReader()
    reader.onload = () => updateTemplate(active, { image: reader.result as string })
    reader.readAsDataURL(file)
  }

  function save() {
    setTypingKey((k) => (k ?? 0) + 1)
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Templates</h2>
        <p className="text-sm text-ink/60">
          Três modelos usados em rodízio sequencial. Use <code>{'{{nome}}'}</code> para personalizar.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {templates.map((tp, i) => (
          <button
            key={tp.id}
            onClick={() => setActive(i)}
            className={`group relative flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              active === i ? 'border-transparent text-white' : 'border-border bg-card text-ink/70 hover:text-ink'
            }`}
            style={active === i ? { background: TEMPLATE_COLORS[i] } : undefined}
          >
            <span>T{i + 1} · {tp.name}</span>
            {isFilled(tp) && (
              <span className={active === i ? 'text-white' : 'text-accent'}>●</span>
            )}
            {/* Tooltip preview */}
            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-bg p-2 text-left text-xs font-normal text-ink/80 opacity-0 shadow-xl transition group-hover:opacity-100">
              {tp.text ? tp.text.slice(0, 120) + (tp.text.length > 120 ? '…' : '') : 'Vazio'}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-4 rounded-card border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink/50">
              Nome identificador
            </label>
            <input
              value={t.name}
              onChange={(e) => updateTemplate(active, { name: e.target.value })}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent"
            />
          </div>

          <div>
            <div className="mb-1.5 flex justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                Mensagem
              </label>
              <span className="text-xs text-ink/40">{t.text.length} caracteres</span>
            </div>
            <textarea
              value={t.text}
              onChange={(e) => updateTemplate(active, { text: e.target.value })}
              rows={5}
              placeholder="Olá {{nome}}, ..."
              className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent"
            />
          </div>

          {/* Image */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink/50">
              Imagem (opcional)
            </label>
            {t.image ? (
              <div className="relative inline-block">
                <img src={t.image} alt="template" className="max-h-40 rounded-lg border border-border" />
                <button
                  onClick={() => updateTemplate(active, { image: null })}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-bg px-4 py-3 text-sm text-ink/60 transition hover:border-accent"
              >
                <ImagePlus size={18} /> Adicionar imagem (JPG/PNG)
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImage(f)
                e.target.value = ''
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink/50">
              Legenda da imagem
            </label>
            <input
              value={t.caption}
              onChange={(e) => updateTemplate(active, { caption: e.target.value })}
              placeholder="Legenda com {{nome}}"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent"
            />
          </div>

          <button
            onClick={save}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Salvo!' : 'Salvar template'}
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
            Pré-visualização (exemplo: {previewName})
          </p>
          <WhatsAppBubble
            text={personalize(t.text, previewName)}
            image={t.image}
            caption={personalize(t.caption, previewName)}
            typingKey={typingKey}
          />
          <p className="text-xs text-ink/40">
            Se nenhuma imagem for adicionada, apenas o texto é enviado (sem erro).
          </p>
        </div>
      </div>
    </div>
  )
}
