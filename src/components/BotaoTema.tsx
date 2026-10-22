import { useEffect, useState } from 'react'

type Tema = 'claro' | 'escuro'

const CHAVE = 'portal-nf-tema'

/** Tema inicial: o que a pessoa escolheu antes, ou o do sistema operacional. */
function temaInicial(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'claro' || salvo === 'escuro') return salvo
  } catch {
    // sem localStorage: segue o sistema
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

/** Botão do topo que alterna entre modo claro e noturno. As cores ficam em index.css. */
export function BotaoTema() {
  const [tema, setTema] = useState<Tema>(temaInicial)

  useEffect(() => {
    document.documentElement.dataset.theme = tema === 'escuro' ? 'dark' : 'light'
  }, [tema])

  function alternar() {
    const novo = tema === 'escuro' ? 'claro' : 'escuro'
    setTema(novo)
    try {
      localStorage.setItem(CHAVE, novo)
    } catch {
      // ignora
    }
  }

  const escuro = tema === 'escuro'
  return (
    <button
      type="button"
      className="btn-icone"
      onClick={alternar}
      aria-label={escuro ? 'Mudar para modo claro' : 'Mudar para modo noturno'}
      title={escuro ? 'Mudar para modo claro' : 'Mudar para modo noturno'}
    >
      {escuro ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  )
}
