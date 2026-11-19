import type { Table } from 'dexie'
import type { BaseRecord, ID, NewRecord } from './types'

/*
 * Funções genéricas de escrita. Toda gravação passa por aqui para garantir
 * que `id`, `createdAt`, `updatedAt` e `deletedAt` sejam sempre preenchidos
 * do mesmo jeito, em qualquer tabela.
 */

/** Campos automáticos de um registro novo. */
export function newBaseRecord(now: number = Date.now()): BaseRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

/** Insere um registro novo e devolve o registro completo (com id e datas). */
export async function createRecord<T extends BaseRecord>(
  table: Table<T, ID>,
  data: NewRecord<T>,
): Promise<T> {
  // O TypeScript não consegue provar que "dados + campos base" formam um T
  // quando T é genérico, por isso o `as T`. As duas metades estão tipadas acima.
  const record = { ...data, ...newBaseRecord() } as T
  await table.add(record)
  return record
}

/**
 * Lê e grava o registro numa transação só: duas chamadas seguidas (ex.: toque duplo)
 * não leem o mesmo estado antigo e uma apaga a outra. Dentro de outra transação,
 * o Dexie simplesmente participa dela.
 */
async function modifyRecord<T extends BaseRecord>(
  table: Table<T, ID>,
  id: ID,
  change: (record: T, now: number) => T,
): Promise<void> {
  await table.db.transaction('rw', table, async () => {
    const record = await table.get(id)
    if (!record) {
      throw new Error(`Registro ${id} não encontrado`)
    }
    await table.put(change(record, Date.now()))
  })
}

/** Atualiza campos de um registro e renova o `updatedAt`. */
export async function updateRecord<T extends BaseRecord>(
  table: Table<T, ID>,
  id: ID,
  changes: Partial<NewRecord<T>>,
): Promise<void> {
  await updateRecordWith(table, id, () => changes)
}

/**
 * Como `updateRecord`, mas os campos novos dependem do valor ATUAL do registro
 * (ex.: alternar "concluída"). Ler e gravar acontecem na mesma transação.
 */
export async function updateRecordWith<T extends BaseRecord>(
  table: Table<T, ID>,
  id: ID,
  changesFrom: (current: T) => Partial<NewRecord<T>>,
): Promise<void> {
  await modifyRecord(table, id, (record, now) => ({
    ...record,
    ...changesFrom(record),
    updatedAt: now,
  }))
}

/** Exclusão lógica: marca `deletedAt` em vez de apagar a linha. */
export async function softDelete<T extends BaseRecord>(
  table: Table<T, ID>,
  id: ID,
): Promise<void> {
  await modifyRecord(table, id, (record, now) => ({
    ...record,
    deletedAt: now,
    updatedAt: now,
  }))
}

/** Desfaz uma exclusão lógica (botão "Desfazer"). Novo `updatedAt`: vence o tombstone na sincronização. */
export async function restoreRecord<T extends BaseRecord>(
  table: Table<T, ID>,
  id: ID,
): Promise<void> {
  await modifyRecord(table, id, (record, now) => ({
    ...record,
    deletedAt: null,
    updatedAt: now,
  }))
}

/** `true` se o registro não foi excluído. Use em `.filter(isActive)`. */
export function isActive(record: BaseRecord): boolean {
  return record.deletedAt === null
}
