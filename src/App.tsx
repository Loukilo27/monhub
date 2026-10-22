import { HashRouter, Route, Routes } from 'react-router'
import { ReloadPrompt } from './components/ReloadPrompt'
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts'
import AppPage from './pages/AppPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import SettingsPage from './pages/SettingsPage'
import { ThemeProvider } from './theme/ThemeProvider'

export function AppRoutes() {
  useKeyboardShortcuts()
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/app/:appId" element={<AppPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      {/* HashRouter : GitHub Pages ne sait pas réécrire les URL vers index.html. */}
      <HashRouter>
        <AppRoutes />
      </HashRouter>
      <ReloadPrompt />
    </ThemeProvider>
  )
}
