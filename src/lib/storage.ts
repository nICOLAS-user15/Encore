/**
 * Pede ao navegador para NÃO apagar os dados do app quando o espaço em disco
 * apertar. Sem isso, o IndexedDB é "best effort" e pode ser limpo pelo sistema
 * (o Safari, por exemplo, limpa dados de sites não usados por alguns dias).
 *
 * Devolve `true` se o armazenamento ficou persistente.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    return false
  }
  if (await navigator.storage.persisted()) {
    return true
  }
  return navigator.storage.persist()
}
