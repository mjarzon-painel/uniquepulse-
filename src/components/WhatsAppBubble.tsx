import { useEffect, useState } from 'react'

interface Props {
  text: string
  image: string | null
  caption: string
  /** trigger the "typing..." animation (e.g. on save) */
  typingKey?: number
}

/** WhatsApp-style chat bubble preview. */
export default function WhatsAppBubble({ text, image, caption, typingKey }: Props) {
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    if (typingKey === undefined) return
    setTyping(true)
    const t = setTimeout(() => setTyping(false), 1300)
    return () => clearTimeout(t)
  }, [typingKey])

  return (
    <div
      className="rounded-card p-4"
      style={{
        background:
          'linear-gradient(180deg, rgba(11,20,17,0.4), rgba(11,20,17,0.4)), url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Cpath d=\'M0 20h40M20 0v40\' stroke=\'%23ffffff08\'/%3E%3C/svg%3E")',
        backgroundColor: '#0b1411',
      }}
    >
      <div className="flex justify-end">
        {typing ? (
          <div className="rounded-2xl rounded-br-sm bg-[#005c4b] px-4 py-3">
            <div className="flex gap-1">
              <span className="typing-dot inline-block h-2 w-2 rounded-full bg-white/70" style={{ animationDelay: '0s' }} />
              <span className="typing-dot inline-block h-2 w-2 rounded-full bg-white/70" style={{ animationDelay: '0.2s' }} />
              <span className="typing-dot inline-block h-2 w-2 rounded-full bg-white/70" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        ) : (
          <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#005c4b] p-1.5 shadow-lg">
            {image && (
              <div className="overflow-hidden rounded-xl">
                <img src={image} alt="preview" className="max-h-56 w-full object-cover" />
                {caption && (
                  <p className="whitespace-pre-wrap px-2 py-1 text-[13px] leading-snug text-white">
                    {caption}
                  </p>
                )}
              </div>
            )}
            {text && (
              <p className="whitespace-pre-wrap px-2 py-1 text-[14px] leading-snug text-white">
                {text}
              </p>
            )}
            {!text && !image && (
              <p className="px-2 py-1 text-[13px] italic text-white/50">Sua mensagem aparece aqui…</p>
            )}
            <div className="flex items-center justify-end gap-1 px-2 pb-0.5 text-[10px] text-white/60">
              <span>
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <svg viewBox="0 0 16 11" className="h-3 w-4 fill-[#53bdeb]">
                <path d="M11.07.65a.5.5 0 0 0-.7.02L5.2 6.3 3.4 4.5a.5.5 0 0 0-.7.7l2.16 2.16a.5.5 0 0 0 .72-.02L11.1 1.35a.5.5 0 0 0-.03-.7Z" />
                <path d="M15.07.65a.5.5 0 0 0-.7.02L9.2 6.3l-.5-.5-.72.78.86.86a.5.5 0 0 0 .72-.02L15.1 1.35a.5.5 0 0 0-.03-.7Z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
