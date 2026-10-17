import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import '@fontsource-variable/archivo'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/jetbrains-mono'
import { startAnalytics } from './lib/firebase'

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
})

void startAnalytics()
