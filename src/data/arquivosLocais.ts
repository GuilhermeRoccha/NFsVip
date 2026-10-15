// Guarda os arquivos das NFs no IndexedDB do navegador (modo demonstração).
// Na versão real isso vira um "bucket" privado do Supabase Storage.

const BANCO = 'portal-nf-arquivos'
const TABELA = 'arquivos'

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const req = indexedDB.open(BANCO, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(TABELA)
    req.onsuccess = () => ok(req.result)
    req.onerror = () => erro(req.error)
  })
}

async function transacao<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir()
  return new Promise((ok, erro) => {
    const req = fn(db.transaction(TABELA, modo).objectStore(TABELA))
    req.onsuccess = () => ok(req.result)
    req.onerror = () => erro(req.error)
  })
}

export const guardarArquivo = (chave: string, arquivo: Blob) => transacao('readwrite', (s) => s.put(arquivo, chave))
export const lerArquivo = (chave: string) => transacao<Blob | undefined>('readonly', (s) => s.get(chave))
export const limparArquivos = () => transacao('readwrite', (s) => s.clear())
