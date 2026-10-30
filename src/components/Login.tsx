// Tela de login. Entra quem está em Cadastros → Usuários, com o nível cadastrado lá.
// Por enquanto é um login de teste, sem senha, que só vale neste navegador.
// O login de verdade (link no e-mail) entra junto com o banco de dados.

import { useState, type FormEvent } from 'react'
import { NOME_DO_PERFIL } from '../domain/acesso'
import { useApp } from '../estado'

export function Login() {
  const { dados, entrar } = useApp()
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')

  function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(entrar(email) ? '' : 'Este e-mail não tem acesso ao portal. Peça ao Comercial para liberar.')
  }

  return (
    <main className="login">
      <section className="panel">
        <h1>Portal NF</h1>
        <form onSubmit={enviar} className="login-form">
          <p className="sub">Entre com o seu e-mail.</p>
          <label>
            E-mail
            <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {erro && <div className="notice err">{erro}</div>}
          <button className="btn primary" type="submit">
            Entrar
          </button>
        </form>
        <div className="contas-teste">
          <span className="muted">Teste: entre como</span>
          {dados?.acessos.map((a) => (
            <button key={a.email} type="button" className="link" onClick={() => entrar(a.email)}>
              {a.email} <span className="muted">· {NOME_DO_PERFIL[a.perfil]}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
