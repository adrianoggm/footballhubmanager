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

  return <AppRouter auth={auth} onLogout={handleLogout} />
}
