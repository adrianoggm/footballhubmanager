// Display format for calendar dates (PL-20): DD/MM/YYYY, the same format the
// DateField inputs use regardless of UI language, so a season range reads the
// same in history, chips and forms ("01/09/2026", not "1/9/2026").

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/

export const formatIsoDate = (value) => {
  if (!value) {
    return '-'
  }
  const match = ISO_DATE_RE.exec(String(value))
  if (!match) {
    return String(value)
  }
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

export const formatDateRange = (start, end) => `${formatIsoDate(start)} - ${formatIsoDate(end)}`
