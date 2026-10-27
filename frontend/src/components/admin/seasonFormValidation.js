// Shared validation for the season create and edit forms (PL-02, PL-07, PL-08).
// Both forms apply the same rules: required dates, end >= start, and points
// that are required integers >= 0.

export const SEASON_POINT_FIELDS = ['points_win', 'points_draw', 'points_loss']

export const emptySeasonFormErrors = () => ({
  start_date: '',
  end_date: '',
  points_win: '',
  points_draw: '',
  points_loss: '',
})

// A cleared number input must stay empty (and fail as required) instead of
// being coerced to 0 by `Number('')` (PL-07).
export const parsePointsInput = (raw) => {
  if (raw === '' || raw === null || raw === undefined) {
    return ''
  }
  return Number(raw)
}

const pointsError = (value, t) => {
  if (value === '' || value === null || value === undefined) {
    return t('dashboard.admin.errors.seasonPointsRequired')
  }
  if (!Number.isInteger(value) || value < 0) {
    return t('dashboard.admin.errors.seasonPointsInvalid')
  }
  return ''
}

export const validateSeasonForm = (form, t) => {
  const errors = emptySeasonFormErrors()
  if (!form.start_date) {
    errors.start_date = t('dashboard.admin.errors.selectedSeasonStartDateRequired')
  }
  if (!form.end_date) {
    errors.end_date = t('dashboard.admin.errors.selectedSeasonEndDateRequired')
  }
  if (!errors.start_date && !errors.end_date && form.start_date > form.end_date) {
    errors.end_date = t('dashboard.admin.errors.invalidSeasonRange')
  }
  SEASON_POINT_FIELDS.forEach((name) => {
    errors[name] = pointsError(form[name], t)
  })
  return errors
}

export const hasSeasonFormErrors = (errors) => Object.values(errors || {}).some(Boolean)
