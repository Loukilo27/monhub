import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { useState, type ReactNode } from 'react'
import { createHashRouter, Outlet, RouterProvider, type RouteObject } from 'react-router'
import { ClockRinger } from './apps/clock/ClockRinger'
import { AuthGate } from './auth/AuthGate'
import { AuthProvider } from './auth/AuthProvider'
import { DemoAuthProvider } from './auth/DemoAuthProvider'
import { ReloadPrompt } from './components/ReloadPrompt'
import { ToastProvider } from './components/toast'
import { isDemoMode } from './data'
import { useRealtimeSync } from './data/queries'
import { persistOptions, queryClient } from './data/queryClient'
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts'
import { isSupabaseConfigured } from './lib/supabase'
import { useNotificationLinks } from './notifications/useNotificationLinks'
import AppPage from './pages/AppPage'
import HomePage from './pages/HomePage'
import NotConfiguredPage from './pages/NotConfiguredPage'
import NotFoundPage from './pages/NotFoundPage'
import SettingsPage from './pages/SettingsPage'
import { useSettingsSync } from './settings/settingsSync'
import { ThemeProvider } from './theme/ThemeProvider'

/** Racine des pages connectées : raccourcis clavier, synchronisation, temps réel et notifications. */
function RootLayout() {
  useKeyboardShortcuts()
  useSettingsSync()
  useRealtimeSync()
  useNotificationLinks()
  return (
    <>
      <Outlet />
      <ClockRinger />
    </>
  )
}

const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/app/:appId', element: <AppPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

function Router() {
  // Routage par « hash » (#/app/notes) : GitHub Pages ne sait pas réécrire les URL vers index.html.
  const [router] = useState(() => createHashRouter(routes))
  return <RouterProvider router={router} />
}

function Authenticated({ children }: { children: ReactNode }) {
  if (isDemoMode) return <DemoAuthProvider>{children}</DemoAuthProvider>
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        {isSupabaseConfigured || isDemoMode ? (
          <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
            <Authenticated>
              <Router />
            </Authenticated>
          </PersistQueryClientProvider>
        ) : (
          <NotConfiguredPage />
        )}
        <ReloadPrompt />
      </ToastProvider>
    </ThemeProvider>
  )
}
