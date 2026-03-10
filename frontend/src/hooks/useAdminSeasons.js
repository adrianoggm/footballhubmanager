import { useCallback, useState } from 'react'

const defaultDateErrors = () => ({
  start_date: '',
  end_date: '',
})

export function useAdminSeasons({ setSelectedSeasonForm, t }) {
  const [selectedSeasonDateErrors, setSelectedSeasonDateErrors] = useState(defaultDateErrors)

  const resetSelectedSeasonDateErrors = useCallback(() => {
    setSelectedSeasonDateErrors(defaultDateErrors)
  }, [])

  const onSelectedSeasonField = useCallback(
    (name) => (event) => {
      const value = name.startsWith('points_') ? Number(event.target.value) : event.target.value
      setSelectedSeasonForm((prev) => ({ ...prev, [name]: value }))
      if (name === 'start_date' || name === 'end_date') {
        setSelectedSeasonDateErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev))
      }
    },
    [setSelectedSeasonForm]
  )

  const validateSelectedSeasonForm = useCallback(
    (form) => {
      const nextErrors = defaultDateErrors()

      if (!form.start_date) {
        nextErrors.start_date = t('dashboard.admin.errors.selectedSeasonStartDateRequired')
      }
      if (!form.end_date) {
        nextErrors.end_date = t('dashboard.admin.errors.selectedSeasonEndDateRequired')
      }
      if (!nextErrors.start_date && !nextErrors.end_date && form.start_date > form.end_date) {
        nextErrors.end_date = t('dashboard.admin.errors.invalidSeasonRange')
      }

      setSelectedSeasonDateErrors(nextErrors)
      return !nextErrors.start_date && !nextErrors.end_date
    },
    [t]
  )

  return {
    selectedSeasonDateErrors,
    onSelectedSeasonField,
    validateSelectedSeasonForm,
    resetSelectedSeasonDateErrors,
  }
}
