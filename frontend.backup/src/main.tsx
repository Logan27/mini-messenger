import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App.tsx'
// @ts-ignore - CSS import
import './index.css'
// Import accessibility styles
import './components/ui/accessibility.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)