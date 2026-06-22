import React from 'react'

interface Props {
  children: React.ReactNode
}
interface State {
  error: Error | null
}

/** Evita a "tela branca": captura erros de render e mostra um aviso + recuperação. */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // Ajuda a diagnosticar no console.
    console.error('UniquePulse — erro capturado:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a1733',
          color: '#eef3fc',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: 16,
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: '100%',
            background: '#112147',
            border: '1px solid #b68f37',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <img
            src="/logo-icon.png"
            alt="Unique"
            style={{ height: 56, width: 56, objectFit: 'contain', margin: '0 auto 8px' }}
          />
          <h2 style={{ margin: '4px 0', fontSize: 18, fontWeight: 800 }}>Ops, algo deu errado</h2>
          <p style={{ color: '#9fb0d0', fontSize: 13, margin: '8px 0' }}>
            A tela travou ao carregar. Geralmente é resolvido limpando os dados salvos no navegador.
          </p>
          <pre
            style={{
              textAlign: 'left',
              fontSize: 11,
              color: '#f0a6a6',
              background: '#0a1733',
              border: '1px solid #21356b',
              borderRadius: 8,
              padding: 10,
              overflow: 'auto',
              maxHeight: 120,
              whiteSpace: 'pre-wrap',
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={() => location.reload()}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #21356b',
                background: '#0a1733',
                color: '#eef3fc',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Recarregar
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.clear()
                } catch {
                  /* ignore */
                }
                location.reload()
              }}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                background: '#e9b949',
                color: '#000',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Limpar dados e recarregar
            </button>
          </div>
        </div>
      </div>
    )
  }
}
