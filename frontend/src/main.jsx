import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'

import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App.jsx'
import { I18nProvider } from './i18n/I18nProvider.jsx'
import { ThemeModeProvider } from './theme/ThemeModeProvider.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <ThemeModeProvider>
        <App />
      </ThemeModeProvider>
    </I18nProvider>
  </React.StrictMode>
)
