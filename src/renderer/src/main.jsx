import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import Header from './components/Header'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <main className="flex flex-col h-screen w-screen bg-zinc-800 border border-zinc-700 rounded-md  select-none">
      <Header />
      <App
       />
    </main>
  </StrictMode>
)
