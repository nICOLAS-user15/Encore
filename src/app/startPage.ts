/*
 * Página inicial: ao ENTRAR no app, o usuário sempre começa no Treino.
 *
 * O manifesto já diz `start_url: '/treino'`, mas o navegador (ou o celular)
 * às vezes reabre a última página visitada, por exemplo, uma aba restaurada.
 * Por isso, antes de o router ler a URL, trocamos o endereço para /treino.
 *
 * Exceção: recarregar a página (F5 / puxar para atualizar) continua onde estava.
 */

export const START_PATH = '/treino'

/**
 * `navigationType` vem da Navigation Timing API do navegador:
 * 'navigate' (abriu), 'reload' (recarregou), 'back_forward' (voltou de outro site).
 */
export function shouldGoToStartPage(navigationType: string | undefined): boolean {
  return navigationType !== 'reload'
}

/** Leva a URL para a página inicial, se for o caso. Chame ANTES de criar o router. */
export function goToStartPage(): void {
  const [entry] = performance.getEntriesByType(
    'navigation',
  ) as PerformanceNavigationTiming[]
  if (shouldGoToStartPage(entry?.type) && window.location.pathname !== START_PATH) {
    // replaceState troca o endereço sem recarregar e sem criar um "voltar" para a página antiga.
    window.history.replaceState(null, '', START_PATH)
  }
}
