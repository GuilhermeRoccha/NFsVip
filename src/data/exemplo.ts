// Dados fictícios para demonstração. Nomes, números e valores são inventados.

import { inicioDoDia, pagamentoNoOuApos, quintaNoOuApos, DIA_MS } from '../domain/regras'
import type { Contrato, EtapaId, Fornecedor, Nota } from '../domain/tipos'
import type { Dados } from './armazenamento'

interface Modelo {
  nome: string
  base: number
  contrato: string
  cc: string
  tipo: string
  limite: number
}

const MODELOS: Modelo[] = [
  { nome: 'Distribuidora Aurora', base: 42000, contrato: '4600000398', cc: '306.002', tipo: 'Alimentação 1', limite: 1200000 },
  { nome: 'Buffet Ipê', base: 95000, contrato: '4600000403', cc: '306.005', tipo: 'Alimentação 4', limite: 2400000 },
  { nome: 'Café Planalto', base: 6800, contrato: '4600000414', cc: '306.003', tipo: 'Alimentação 2', limite: 140000 },
  { nome: 'Hortifruti Cerrado', base: 9500, contrato: '4600000421', cc: '306.005', tipo: 'Alimentação 4', limite: 120000 },
  { nome: 'Bebidas Norte Sul', base: 28000, contrato: '4600000401', cc: '306.004', tipo: 'Alimentação 3', limite: 800000 },
  { nome: 'Limpeza Brilho', base: 2400, contrato: '4600000410', cc: '306.002', tipo: 'Materiais limpeza', limite: 40000 },
  { nome: 'Gás Central', base: 4300, contrato: '4600000413', cc: '306.002', tipo: 'Gás', limite: 80000 },
  { nome: 'Confeitaria Asa Sul', base: 15000, contrato: '4600000404', cc: '306.006', tipo: 'Alimentação 5', limite: 260000 },
  { nome: 'Papelaria Eixo', base: 600, contrato: '', cc: '306.002', tipo: 'Materiais escritório', limite: 0 },
  { nome: 'Frios Serra Azul', base: 11000, contrato: '4600000423', cc: '306.004', tipo: 'Alimentação 3', limite: 140000 },
  { nome: 'Águas do Lago', base: 5200, contrato: '4600000453', cc: '306.002', tipo: 'Alimentação 1', limite: 120000 },
  { nome: 'Manutenção Vértice', base: 1800, contrato: '', cc: '306.002', tipo: 'Serviços', limite: 0 },
]

/** Gerador pseudoaleatório com semente, para o exemplo ser sempre igual. */
function aleatorio(semente: number) {
  return () => {
    semente = (semente + 0x6d2b79f5) | 0
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function gerarExemplo(agora: Date): Dados {
  const r = aleatorio(20261015)
  const fornecedores: Fornecedor[] = MODELOS.map((m, i) => ({
    id: `f${i + 1}`,
    nome: m.nome,
    razaoSocial: `${m.nome} Ltda`,
    cnpj: `${String(10 + i).padStart(2, '0')}.${String(100 + i * 7).slice(-3)}.${String(200 + i * 13).slice(-3)}/0001-${String(10 + i).slice(-2)}`,
    codigoSap: String(104800 + i * 37),
    tipo: m.tipo,
    centroCusto: m.cc,
    ativo: true,
  }))
  const contratos: Contrato[] = MODELOS.flatMap((m, i) =>
    m.contrato ? [{ id: `c${i + 1}`, numero: m.contrato, fornecedorId: `f${i + 1}`, valor: m.limite, ativo: true }] : [],
  )

  const notas: Nota[] = []
  let seq = 1
  let numChamado = 21480
  const chamadoDaQuinta: Record<string, string> = {}

  const naHora = (d: Date, h: number) => {
    const x = inicioDoDia(d)
    x.setHours(h, Math.floor(r() * 60))
    return x
  }
  // Empurra horários para o expediente (8h–18h, seg–sex).
  const expediente = (d: Date) => {
    let x = new Date(d)
    if (x.getHours() < 8) x.setHours(8 + Math.floor(r() * 3), Math.floor(r() * 60))
    if (x.getHours() >= 18) {
      x = new Date(x.getTime() + DIA_MS)
      x.setHours(9, Math.floor(r() * 60))
    }
    while (x.getDay() === 0 || x.getDay() === 6) x = new Date(x.getTime() + DIA_MS)
    return x
  }

  const criar = (fi: number, recebida: Date, vencimento: Date, emissao: Date): Nota => {
    const m = MODELOS[fi]
    return {
      id: `n${seq++}`,
      fornecedorId: `f${fi + 1}`,
      numero: String(1000 + Math.floor(r() * 98000)),
      valor: Math.round(m.base * (0.45 + r() * 1.1) * 100) / 100,
      emissao: inicioDoDia(emissao).toISOString(),
      vencimento: inicioDoDia(vencimento).toISOString(),
      contrato: m.contrato,
      centroCusto: m.cc,
      oc: '',
      folha: '',
      chamado: '',
      pendencia: '',
      arquivoNome: '',
      etapas: [{ etapa: 'recebida', em: recebida.toISOString(), por: 'Sala VIP' }],
      alteracoes: [],
    }
  }

  for (let mesesAtras = 9; mesesAtras >= 0; mesesAtras--) {
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth() - mesesAtras, 1)
    const qtd = mesesAtras === 0 ? Math.min(14, agora.getDate()) : 16 + Math.floor(r() * 9)
    for (let i = 0; i < qtd; i++) {
      const fi = Math.floor(Math.pow(r(), 1.4) * MODELOS.length)
      const ultimoDia =
        mesesAtras === 0
          ? Math.max(1, agora.getDate() - 1)
          : new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0).getDate()
      const recebida = naHora(
        new Date(inicioMes.getFullYear(), inicioMes.getMonth(), 1 + Math.floor(r() * ultimoDia)),
        8 + Math.floor(r() * 9),
      )
      if (recebida > agora) continue
      const nota = criar(
        fi,
        recebida,
        new Date(recebida.getTime() + (9 + Math.floor(r() * 26)) * DIA_MS),
        new Date(recebida.getTime() - (1 + Math.floor(r() * 4)) * DIA_MS),
      )
      notas.push(nota)

      let t = recebida
      const passo = (etapa: EtapaId, intervalo: number, por: string) => {
        t = expediente(new Date(t.getTime() + intervalo))
        if (t > agora) return false
        nota.etapas.push({ etapa, em: t.toISOString(), por })
        return true
      }
      const lento = r() < 0.15 ? 3 : 1
      if (!passo('conferida', (0.2 + r() * 1.2) * DIA_MS, 'Comercial')) continue
      if (!passo('oc', (0.5 + r() * 3 * lento) * DIA_MS, 'Compras')) continue
      nota.oc = '47000' + (96000 + Math.floor(r() * 900))
      if (!passo('migo', (0.3 + r() * 1.5) * DIA_MS, 'Comercial')) continue
      nota.folha = '10000' + (57000 + Math.floor(r() * 990))
      if (!passo('acordo', (0.4 + r() * 2.2 * lento) * DIA_MS, 'Coordenação SV')) continue

      // Chamado só na quinta; várias NFs da mesma quinta dividem o mesmo chamado.
      const quinta = quintaNoOuApos(new Date(t.getTime() + 0.1 * DIA_MS))
      quinta.setHours(10, Math.floor(r() * 50))
      if (quinta > agora) continue
      t = quinta
      nota.etapas.push({ etapa: 'chamado', em: t.toISOString(), por: 'Comercial' })
      const chave = inicioDoDia(quinta).toISOString()
      chamadoDaQuinta[chave] ??= '#' + (numChamado += 37)
      nota.chamado = chamadoDaQuinta[chave]

      const pagamento = pagamentoNoOuApos(new Date(t.getTime() + DIA_MS * (r() < 0.7 ? 7 : 14)))
      pagamento.setHours(15, 0)
      if (pagamento > agora) continue
      nota.etapas.push({ etapa: 'paga', em: pagamento.toISOString(), por: 'Financeiro' })
    }
  }

  // Algumas NFs recebidas hoje.
  ;[0, 3, 7, 2].forEach((fi, i) => {
    const recebida = new Date(agora.getTime() - (i * 95 + 20) * 6e4)
    notas.push(
      criar(fi, recebida, new Date(agora.getTime() + (5 + i * 6) * DIA_MS), new Date(agora.getTime() - 2 * DIA_MS)),
    )
  })

  const comPendencia = notas.find((n) => n.etapas.length === 3)
  if (comPendencia) comPendencia.pendencia = 'Valor da NF diferente da OC (R$ 120,00 a mais)'

  return { notas, fornecedores, contratos, auditoria: [] }
}
