// Runs before each test file.

// Node has no IndexedDB: this lib creates an in-memory implementation.
import 'fake-indexeddb/auto'
// Extra matchers for the DOM, like `toBeInTheDocument()` and `toBeDisabled()`.
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom does not implement `showModal()`/`close()` of <dialog> yet (used by the
// Sheet and the SideMenu). Minimal imitation: toggles the `open` attribute and
// fires the "close" event, as the browser does. It does not imitate focus or an inert background.
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

// With tests running in parallel (jsdom + in-memory database), the default 1 s wait of
// findBy*/waitFor times out for no reason; 5 s still fails fast when the error is real.
configure({ asyncUtilTimeout: 5000 })

// Unmounts rendered components between tests.
afterEach(() => {
  cleanup()
})
