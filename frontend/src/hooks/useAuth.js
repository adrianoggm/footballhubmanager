import { useCallback, useEffect, useState } from 'react'
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

const restoredState = (session) =>
  session?.user_type ? { status: 'authenticated', error: null, session } : loggedOutState

export function useAuth() {
  const [state, setState] = useState(restoringState)

  useEffect(() => {
    let active = true
    authController
      .restore()
      .then((session) => active && setState(restoredState(session)))
      // Only a 401 means "logged out"; otherwise the session is unknown (server
      // or network down) and the app offers a retry instead of logging out.
      .catch((error) => active && setState({ status: 'unavailable', error, session: null }))
    return () => {
      active = false
    }
  }, [])

  const retryRestore = useCallback(async () => {
    setState(restoringState)
    try {
      setState(restoredState(await authController.restore()))
    } catch (error) {
      setState({ status: 'unavailable', error, session: null })
    }
  }, [])

  const handleSuccess = (session) => {
    setState({ status: 'authenticated', error: null, session })
  }

  // Auth failures (bad credentials, taken username...) are expected outcomes shown
  // in the UI, so they are not logged to the console.
  const handleError = (error) => {
    setState((prev) => ({ ...prev, status: 'error', error }))
  }

  const clearError = useCallback(() => {
    setState((prev) =>
      prev.error ? { ...prev, status: prev.session ? 'authenticated' : 'idle', error: null } : prev
    )
  }, [])

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
    clearError,
    retryRestore,
  }
}
