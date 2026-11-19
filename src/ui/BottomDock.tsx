import { createContext, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/*
 * "Doca": a faixa fixa logo acima das abas, onde ficam os avisos que flutuam
 * sobre a tela (descanso, nova versão, treino em andamento).
 *
 * Antes cada aviso se posicionava sozinho no mesmo lugar e um cobria o outro.
 * Agora todos são "teletransportados" (createPortal) para dentro de UM container
 * em coluna: se aparecerem dois ao mesmo tempo, eles se empilham.
 */

/** O elemento da doca. `undefined` = não há provider (ex.: nos testes de um componente só). */
const DockContext = createContext<HTMLElement | null | undefined>(undefined)

// pointer-events-none no container: a área vazia da doca não "rouba" toques da tela.
// `*:` aplica nos filhos diretos (cada aviso), que voltam a receber toques
// e sobem do rodapé ao aparecer (animate-dock-in).
const dockClasses =
  'pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex flex-col gap-2 px-4 pb-3 *:pointer-events-auto *:mx-auto *:w-full *:max-w-xl *:animate-dock-in'

/** Cria a doca. Fica uma vez só, em volta do app inteiro (App.tsx). */
export function BottomDockProvider({ children }: { children: ReactNode }) {
  // Guardamos o elemento em estado (via ref de função) para os avisos saberem quando ele existe.
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  return (
    <DockContext value={node}>
      {children}
      <div ref={setNode} className={dockClasses} />
    </DockContext>
  )
}

/** Um aviso dentro da doca. `children` deve ser UM elemento (o cartão do aviso). */
export function DockItem({ children }: { children: ReactNode }) {
  const node = useContext(DockContext)
  if (node === undefined) {
    // Sem provider: funciona sozinho, no mesmo lugar (sem empilhar).
    return <div className={dockClasses}>{children}</div>
  }
  if (node === null) {
    return null // a doca ainda está sendo montada (dura um instante)
  }
  return createPortal(children, node)
}
