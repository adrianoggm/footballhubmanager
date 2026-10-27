import { useCallback, useState } from 'react'

import {
  emptySeasonFormErrors,
  hasSeasonFormErrors,
  parsePointsInput,
  validateSeasonForm,
} from '../components/admin/seasonFormValidation.js'

// Season create/edit form field handlers + validation. Both forms share the
// same rules (seasonFormValidation.js). `selectedSeasonDateErrors` keeps its
// historical name but now also carries the points errors.
export function useAdminSeasons({ setSelectedSeasonForm, setSeasonForm, t }) {
  const [selectedSeasonDateErrors, setSelectedSeasonDateErrors] = useState(emptySeasonFormErrors)
  const [createSeasonErrors, setCreateSeasonErrors] = useState(emptySeasonFormErrors)

  const resetSelectedSeasonDateErrors = useCallback(() => {
    setSelectedSeasonDateErrors(emptySeasonFormErrors)
  }, [])

  const resetCreateSeasonErrors = useCallback(() => {
    setCreateSeasonErrors(emptySeasonFormErrors)
  }, [])

  const makeFieldHandler = useCallback(
    (setForm, setErrors) => (name) => (event) => {
      const raw = event.target.value
      const value = name.startsWith('points_') ? parsePointsInput(raw) : raw
      setForm((prev) => ({ ...prev, [name]: value }))
      setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev))
    },
    []
  )

  const onSelectedSeasonField = useCallback(
    (name) => makeFieldHandler(setSelectedSeasonForm, setSelectedSeasonDateErrors)(name),
    [makeFieldHandler, setSelectedSeasonForm]
  )

  const onCreateSeasonField = useCallback(
    (name) => makeFieldHandler(setSeasonForm, setCreateSeasonErrors)(name),
    [makeFieldHandler, setSeasonForm]
  )

  const validateSelectedSeasonForm = useCallback(
    (form) => {
      const nextErrors = validateSeasonForm(form, t)
      setSelectedSeasonDateErrors(nextErrors)
      return !hasSeasonFormErrors(nextErrors)
    },
    [t]
  )

  const validateCreateSeasonForm = useCallback(
    (form) => {
      const nextErrors = validateSeasonForm(form, t)
      setCreateSeasonErrors(nextErrors)
      return !hasSeasonFormErrors(nextErrors)
    },
    [t]
  )

  return {
    selectedSeasonDateErrors,
    onSelectedSeasonField,
    validateSelectedSeasonForm,
    resetSelectedSeasonDateErrors,
    createSeasonErrors,
    onCreateSeasonField,
    validateCreateSeasonForm,
    resetCreateSeasonErrors,
  }
}
