import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import '@fontsource-variable/archivo'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/jetbrains-mono'
import { hadSession, warmFirebase } from './lib/firebase'

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
  // Auth + Firestore are a lazy ~200 kB chunk. A browser that has never
  // signed in does not need it at all — it gets fetched the first time the
  // account button is used. A returning visitor has to have their session
  // restored, so we ask for it once the page has actually painted and the
  // browser is no longer busy with the first posters.
  if (!hadSession()) return
  const idle = (window as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback
  if (idle) idle(() => warmFirebase(), { timeout: 2500 })
  else setTimeout(warmFirebase, 1200)
})
