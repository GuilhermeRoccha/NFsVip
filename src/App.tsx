import { BotaoAjuda } from './components/Ajuda'
import { BotaoTema } from './components/BotaoTema'
import { FaixaJanela } from './components/FaixaJanela'
import { Login } from './components/Login'
import { MODO_DEMONSTRACAO } from './data'
import { abasDoPerfil, ambientesDoPerfil, NOME_DO_AMBIENTE } from './domain/acesso'
import { useApp } from './estado'
import { Cadastros } from './pages/Cadastros'
import { Comercial } from './pages/Comercial'
import { Gestao } from './pages/Gestao'
import { Requisicoes } from './pages/Requisicoes'
import { SalaVip } from './pages/SalaVip'

export default function App() {
  const { dados, perfil, ambiente, trocarAmbiente, aba, trocarAba, usuario, sair, aviso, restaurarExemplo, avisar } =
    useApp()
  if (!dados) return <p className="empty">Carregando…</p>
  if (!usuario) return <Login />
  const ambientes = ambientesDoPerfil(perfil)
  const abas = abasDoPerfil(perfil, ambiente)

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand">
            <h1>Portal NF</h1>
            {MODO_DEMONSTRACAO && <span className="tag">Demonstração</span>}
          </div>
          {/* Troca de ambiente: só para quem tem acesso aos dois (Comercial e Gestão). */}
          {ambientes.length > 1 && (
            <nav className="roles" aria-label="Ambiente">
              {ambientes.map((a) => (
                <button key={a} type="button" aria-pressed={ambiente === a} onClick={() => trocarAmbiente(a)}>
                  {NOME_DO_AMBIENTE[a]}
                </button>
              ))}
            </nav>
          )}
          <div className="icones">
            <BotaoAjuda />
            <BotaoTema />
            {usuario && (
              <button
                type="button"
                className="btn-icone"
                onClick={sair}
                aria-label={`Sair (${usuario.nome})`}
                title={`Sair (${usuario.nome})`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {abas.length > 1 && (
          <div className="wrap subnav">
            {abas.map((a) => (
              <button key={a.id} type="button" aria-pressed={aba === a.id} onClick={() => trocarAba(a.id)}>
                {a.nome}
              </button>
            ))}
          </div>
        )}
      </header>
      <FaixaJanela />

      <main className="wrap">
        {!dados ? (
          <p className="empty">Carregando…</p>
        ) : aba === 'enviar' ? (
          <SalaVip />
        ) : aba === 'fila' ? (
          <Comercial origem="vip" />
        ) : aba === 'requisicoes' ? (
          <Requisicoes />
        ) : aba === 'notas' ? (
          <Comercial origem="comercial" />
        ) : aba === 'painel' ? (
          <Gestao origem={ambiente} />
        ) : (
          <Cadastros />
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
