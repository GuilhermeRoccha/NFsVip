import { useState } from 'react'
import { FaixaJanela } from './components/FaixaJanela'
import { MODO_DEMONSTRACAO } from './data'
import type { Perfil } from './domain/tipos'
import { useApp } from './estado'
import { Cadastros } from './pages/Cadastros'
import { Comercial } from './pages/Comercial'
import { Gestao } from './pages/Gestao'
import { SalaVip } from './pages/SalaVip'

const PERFIS: [Perfil, string][] = [
  ['vip', 'Sala VIP'],
  ['comercial', 'Comercial'],
  ['gestao', 'Gestão'],
]

export default function App() {
  const { dados, perfil, trocarPerfil, aviso, restaurarExemplo, avisar } = useApp()
  const [telaComercial, setTelaComercial] = useState<'notas' | 'cadastros'>('notas')

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand">
            <h1>Portal NF · Sala VIP</h1>
            {MODO_DEMONSTRACAO && <span className="tag">Demonstração</span>}
          </div>
          {/* Sem login por enquanto: o perfil é escolhido aqui. Com login, ele virá do usuário. */}
          <nav className="roles" aria-label="Perfil">
            {PERFIS.map(([id, nome]) => (
              <button key={id} type="button" aria-pressed={perfil === id} onClick={() => trocarPerfil(id)}>
                {nome}
              </button>
            ))}
          </nav>
        </div>
        {perfil === 'comercial' && (
          <div className="wrap subnav">
            <button type="button" aria-pressed={telaComercial === 'notas'} onClick={() => setTelaComercial('notas')}>
              Notas
            </button>
            <button type="button" aria-pressed={telaComercial === 'cadastros'} onClick={() => setTelaComercial('cadastros')}>
              Cadastros
            </button>
          </div>
        )}
      </header>
      <FaixaJanela />

      <main className="wrap">
        {!dados ? (
          <p className="empty">Carregando…</p>
        ) : perfil === 'vip' ? (
          <SalaVip />
        ) : perfil === 'gestao' ? (
          <Gestao />
        ) : telaComercial === 'cadastros' ? (
          <Cadastros />
        ) : (
          <Comercial />
        )}

        {MODO_DEMONSTRACAO && (
          <div className="foot">
            <span>Modo demonstração: os dados são fictícios e ficam só neste navegador.</span>
            <button
              className="btn ghost"
              type="button"
              onClick={() => restaurarExemplo().then(() => avisar('Dados de exemplo restaurados'))}
            >
              Restaurar dados de exemplo
            </button>
          </div>
        )}
      </main>
      {aviso && (
        <div className="toast" role="status">
          {aviso}
        </div>
      )}
    </>
  )
}
