/**
 * Extra information each route can declare (the React Router `handle` field).
 * AppLayout reads this to build the top bar.
 */
export type RouteHandle = {
  /**
   * Inner screen: shows "← Voltar" instead of the menu.
   * The value is where to go if there is no previous page (e.g. app opened
   * straight on this screen).
   */
  backTo?: string
}
