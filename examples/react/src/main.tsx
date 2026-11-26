import '@formvk/designable-react/style.css'
import '@formvk/designable-react/theme.css'
import { createRoot } from 'react-dom/client'

import { App } from './App'

import './demo.css'

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(<App />)
}
