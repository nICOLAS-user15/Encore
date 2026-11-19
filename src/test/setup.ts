// Roda antes de cada arquivo de teste.

// O Node não tem IndexedDB: esta lib cria uma implementação em memória.
import 'fake-indexeddb/auto'
// Matchers extras para o DOM, como `toBeInTheDocument()` e `toBeDisabled()`.
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// O jsdom ainda não implementa `showModal()`/`close()` do <dialog> (usados pelo
// Sheet e pelo SideMenu). Imitação mínima: liga/desliga o atributo `open` e
// dispara o evento "close", como o navegador faz. Não imita foco nem fundo inerte.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    if (this.open) {
      this.open = false
      this.dispatchEvent(new Event('close'))
    }
  }
}

// Com os testes rodando em paralelo (jsdom + banco em memória), 1 s de espera padrão do
// findBy*/waitFor estoura à toa; 5 s ainda falha rápido quando o erro é de verdade.
configure({ asyncUtilTimeout: 5000 })

// Desmonta os componentes renderizados entre um teste e outro.
afterEach(() => {
  cleanup()
})
