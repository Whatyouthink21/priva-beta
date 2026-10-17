/* Throwaway harness: bundle the real app as a classic script and mount it in
 * jsdom so CI-me can prove every route actually renders. Not part of the site. */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../src/App'
import '../src/index.css'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
