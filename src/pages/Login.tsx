import { useState } from 'react'
import { LogIn, Lock, User, AlertCircle } from 'lucide-react'
import { useStore } from '../store/useStore'

export default function Login() {
  const login = useStore((s) => s.login)
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const ok = login(user, pass)
    if (!ok) setError(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div
        className="w-full max-w-sm rounded-card border border-border bg-card p-8 shadow-2xl"
        style={{ boxShadow: '0 0 60px rgba(233,185,73,0.08)' }}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/logo-full.png" alt="Unique" className="h-28 w-28 object-contain" />
          <h1 className="mt-2 text-xl font-extrabold tracking-tight">
            Unique<span className="text-accent">Pulse</span>
          </h1>
          <p className="text-xs text-ink/50">Disparos WhatsApp — Unique Automóveis</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink/50">
              Usuário
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                value={user}
                onChange={(e) => {
                  setUser(e.target.value)
                  setError(false)
                }}
                autoFocus
                placeholder="seu usuário"
                className="w-full rounded-lg border border-border bg-bg py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink/50">
              Senha
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                type="password"
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value)
                  setError(false)
                }}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-bg py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              <AlertCircle size={14} /> Usuário ou senha incorretos.
            </div>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-black transition hover:brightness-110"
          >
            <LogIn size={16} /> Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
