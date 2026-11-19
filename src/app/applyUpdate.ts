/** Tempo de espera pela troca do service worker antes de recarregar por conta própria. */
export const UPDATE_RELOAD_FALLBACK_MS = 1500

/**
 * Aplica a versão nova do app: manda o service worker em espera assumir e recarrega.
 *
 * Só chamar `updateServiceWorker(true)` falha em silêncio em alguns casos (visto no
 * celular): a biblioteca só recarrega quando recebe o evento "controlling" de uma
 * ATUALIZAÇÃO, e isso não acontece se a página abriu sem controlador ou se o worker
 * novo já tinha assumido (não há mais ninguém "esperando" para receber a mensagem).
 * Por isso recarregamos também quando o navegador avisa que o controlador mudou
 * (`controllerchange`) e, no pior caso, depois de um tempo: o botão sempre faz algo.
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
  // Rede de segurança: começa a contar antes do await, para valer mesmo se ele travar.
  setTimeout(reloadOnce, UPDATE_RELOAD_FALLBACK_MS)

  try {
    await updateServiceWorker(true)
  } catch {
    // Se falhou, o recarregamento de segurança acima resolve.
  }
}
