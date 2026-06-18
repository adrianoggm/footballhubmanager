import { useEffect, useState } from 'react'
import { authController } from '../services/authController.js'

// 'restoring' while we check the cookie on load, so the router can hold off
// instead of flashing the logged-out UI for an authenticated user on reload.
const restoringState = {
  status: 'restoring',
  error: null,
  session: null,
}

const loggedOutState = {
  status: 'idle',
  error: null,
  session: null,
}

export function useAuth() {
  const [state, setState] = useState(restoringState)

  useEffect(() => {
    let active = true
    authController.restore().then((session) => {
      if (!active) {
        return
      }
      if (session?.user_type) {
        setState({ status: 'authenticated', error: null, session })
      } else {
        setState(loggedOutState)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const handleSuccess = (session) => {
    setState({ status: 'authenticated', error: null, session })
  }

  const handleError = (error) => {
    console.error('Auth error', error)
    setState((prev) => ({ ...prev, status: 'error', error }))
  }

  const loginUser = async (credentials) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }))
    try {
      const session = await authController.loginUser(credentials)
      handleSuccess(session)
      return session
    } catch (error) {
      handleError(error)
      throw error
    }
  }

  const loginAdmin = async (credentials) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }))
    try {
      const session = await authController.loginAdmin(credentials)
      handleSuccess(session)
      return session
    } catch (error) {
      handleError(error)
      throw error
    }
  }

  const registerUser = async (payload) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }))
    try {
      const session = await authController.registerUser(payload)
      handleSuccess(session)
      return session
    } catch (error) {
      handleError(error)
      throw error
    }
  }

  const registerAdmin = async (payload) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }))
    try {
      const session = await authController.registerAdmin(payload)
      handleSuccess(session)
      return session
    } catch (error) {
      handleError(error)
      throw error
    }
  }

  const claimPlayer = async (payload) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }))
    try {
      const session = await authController.claimPlayer(payload)
      handleSuccess(session)
      return session
    } catch (error) {
      handleError(error)
      throw error
    }
  }

  const logout = async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }))
    try {
      await authController.logout()
      setState(loggedOutState)
    } catch (error) {
      handleError(error)
      throw error
    }
  }

  return {
    ...state,
    loginUser,
    loginAdmin,
    registerUser,
    registerAdmin,
    claimPlayer,
    logout,
  }
}
