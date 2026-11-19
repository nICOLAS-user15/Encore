import { useEffect, useRef } from 'react'

/**
 * Liga um `<dialog>` nativo ao estado `open` do React.
 *
 * Por que `<dialog>` + `showModal()` em vez de uma <div> por cima da tela?
 * O navegador já resolve, de graça, o que antes faltava:
 * - o foco vai para dentro do painel e volta para o botão de origem ao fechar;
 * - o resto da página fica inerte (leitor de tela e toques não chegam lá);
 * - Esc (e, no Chrome do Android, o gesto de voltar) fecha o painel;
 * - o painel fica na "camada do topo", acima de tudo, sem brigar com z-index.
 *
 * Uso: `const ref = useModalDialog(open)` e `<dialog ref={ref} onClose={...}>`.
 */
export function useModalDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) {
      return
    }
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return ref
}
