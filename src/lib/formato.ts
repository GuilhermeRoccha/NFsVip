const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const brl = (v: number) => brlFmt.format(v)

const p2 = (n: number) => String(n).padStart(2, '0')
export const dataCurta = (s: string | Date) => {
  const d = new Date(s)
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`
}
export const data = (s: string | Date) => `${dataCurta(s)}/${new Date(s).getFullYear()}`
export const hora = (s: string | Date) => {
  const d = new Date(s)
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`
}
export const dataHora = (s: string | Date) => `${data(s)} ${hora(s)}`

export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const compacto = (v: number) =>
  v >= 1e6
    ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi'
    : v >= 1e3
      ? 'R$ ' + Math.round(v / 1e3).toLocaleString('pt-BR') + ' mil'
      : brl(v)

export const dias = (v: number) =>
  v < 1 ? `${Math.max(1, Math.round(v * 24))} h` : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} d`

/** "1.234,56" ou "1234.56" → 1234.56 */
export function lerValor(s: string): number {
  const t = s.trim()
  if (!t) return NaN
  return t.includes(',') ? parseFloat(t.replace(/\./g, '').replace(',', '.')) : parseFloat(t)
}

/** Data de <input type="date"> (yyyy-mm-dd) → ISO no início do dia local. */
export const deInputData = (s: string) => new Date(s + 'T00:00').toISOString()

/** ISO (início do dia local) → yyyy-mm-dd, o formato de <input type="date"> e das colunas date do banco. */
export function paraInputData(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
