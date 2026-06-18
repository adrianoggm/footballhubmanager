import { useEffect, useState } from 'react'
import { authController } from '../services/authController.js'
import { sessionStore } from '../services/sessionStore.js'

const initialState = {
  status: 'idle',
  token: null,
  error: null,
  session: null,
}

export function useAuth() {
  const [state, setState] = useState(initialState)

  useEffect(() => {
    sessionStore.init()
    const session = sessionStore.getSession()
    if (session?.token) {
      setState({ status: 'authenticated', token: session.token, error: null, session })
    }
  }, [])

  const handleSuccess = (session) => {
    setState({ status: 'authenticated', token: session.token, error: null, session })
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
      setState(initialState)
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
