/**
 * Informação extra que cada rota pode declarar (campo `handle` do React Router).
 * O AppLayout lê isto para montar a barra do topo.
 */
export type RouteHandle = {
  /**
   * Tela interna: mostra "← Voltar" em vez do menu.
   * O valor é para onde ir se não houver página anterior (ex.: app aberto
   * direto nesta tela).
   */
  backTo?: string
}
