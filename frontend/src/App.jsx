import { useAuth } from './hooks/useAuth.js'
import AppRouter from './router/AppRouter.jsx'

export default function App() {
  const auth = useAuth()

  const handleLogout = async () => {
    try {
      await auth.logout()
    } catch {
      // handled in auth state
    }
  }

  // Hold the first paint until the cookie-based session check settles, so a
  // reload doesn't bounce an authenticated user through the logged-out routes.
  if (auth.status === 'restoring') {
    return null
  }

  return <AppRouter auth={auth} onLogout={handleLogout} />
}
