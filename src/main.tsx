import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ChatProvider } from './context/ChatContext'
import { LocaleProvider } from './i18n/LocaleContext'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <ChatProvider>
        <App />
      </ChatProvider>
    </LocaleProvider>
  </StrictMode>
)
