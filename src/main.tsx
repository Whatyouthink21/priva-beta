import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import '@fontsource-variable/archivo'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/jetbrains-mono'
import { warmFirebase } from './lib/firebase'

const container = document.getElementById('root')
if (!container) throw new Error('#root is missing from index.html')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// the boot splash stays until the first real paint, then goes
requestAnimationFrame(() => {
  document.querySelector('.boot')?.remove()
  // Auth + Firestore are a lazy ~200 kB chunk. Only ask for it once the page
  // has actually painted — the browser is busy with the first posters until
  // then, and a visitor who never signs in still gets the whole thing out of
  // the HTTP cache for next time.
  const idle = (window as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback
  if (idle) idle(() => warmFirebase(), { timeout: 2500 })
  else setTimeout(warmFirebase, 1200)
})
