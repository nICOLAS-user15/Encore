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

/**
 * Navigation `state` for a redirect that REPLACES the first page of the session (e.g.
 * opening the app straight on the workout in progress). React Router gives a replaced
 * entry a new `key`, so `key === 'default'` alone no longer says "nothing behind it".
 */
export const FIRST_PAGE = { firstPage: true } as const

/** Whether this location is the first page of the session: "Voltar" has nowhere to go back to. */
export function isFirstPage(location: { key: string; state: unknown }): boolean {
  return (
    location.key === 'default' ||
    (typeof location.state === 'object' &&
      location.state !== null &&
      'firstPage' in location.state)
  )
}
