/**
 * Asks the browser NOT to erase the app data when disk space
 * gets tight. Without this, IndexedDB is "best effort" and can be cleared by the system
 * (Safari, for example, clears data from sites not used for a few days).
 *
 * Returns `true` if storage became persistent.
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
