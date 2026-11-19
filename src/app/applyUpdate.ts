/** Wait time for the service worker swap before reloading on its own. */
export const UPDATE_RELOAD_FALLBACK_MS = 1500

/**
 * Applies the new app version: tells the waiting service worker to take over and reloads.
 *
 * Just calling `updateServiceWorker(true)` fails silently in some cases (seen on the
 * phone): the library only reloads when it receives the "controlling" event from an
 * UPDATE, and that does not happen if the page opened without a controller or if the new
 * worker had already taken over (there is no one "waiting" anymore to receive the message).
 * That is why we also reload when the browser says the controller changed
 * (`controllerchange`) and, in the worst case, after some time: the button always does something.
 */
export async function applyUpdate(
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>,
  reload: () => void = () => window.location.reload(),
): Promise<void> {
  let reloaded = false
  const reloadOnce = () => {
    if (!reloaded) {
      reloaded = true
      reload()
    }
  }

  navigator.serviceWorker?.addEventListener('controllerchange', reloadOnce, {
    once: true,
  })
  // Safety net: starts counting before the await, so it applies even if it hangs.
  setTimeout(reloadOnce, UPDATE_RELOAD_FALLBACK_MS)

  try {
    await updateServiceWorker(true)
  } catch {
    // If it failed, the safety reload above takes care of it.
  }
}
