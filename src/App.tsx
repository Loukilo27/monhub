import { HashRouter, Route, Routes } from 'react-router'
import { AuthGate } from './auth/AuthGate'
import { AuthProvider } from './auth/AuthProvider'
import { ReloadPrompt } from './components/ReloadPrompt'
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts'
import { isSupabaseConfigured } from './lib/supabase'
import AppPage from './pages/AppPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import NotConfiguredPage from './pages/NotConfiguredPage'
import SettingsPage from './pages/SettingsPage'
import { useSettingsSync } from './settings/settingsSync'
import { ThemeProvider } from './theme/ThemeProvider'

export function AppRoutes() {
  useKeyboardShortcuts()
  useSettingsSync()
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
      {isSupabaseConfigured ? (
        <AuthProvider>
          <AuthGate>
            {/* HashRouter : GitHub Pages ne sait pas réécrire les URL vers index.html. */}
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          </AuthGate>
        </AuthProvider>
      ) : (
        <NotConfiguredPage />
      )}
      <ReloadPrompt />
    </ThemeProvider>
  )
}
