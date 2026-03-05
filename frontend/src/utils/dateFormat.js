const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const pad2 = (value) => String(value).padStart(2, '0')

const toDateParts = (value) => {
  if (!value) {
    return null
  }

  const text = String(value).trim()
  if (!text) {
    return null
  }

  const isoCandidate = text.slice(0, 10)
  const isoMatch = ISO_DATE_PATTERN.exec(isoCandidate)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2])
    const day = Number(isoMatch[3])
    const parsedIso = new Date(Date.UTC(year, month - 1, day))
    if (
      Number.isNaN(parsedIso.getTime()) ||
      parsedIso.getUTCFullYear() !== year ||
      parsedIso.getUTCMonth() + 1 !== month ||
      parsedIso.getUTCDate() !== day
    ) {
      return null
    }
    return {
      year: isoMatch[1],
      month: isoMatch[2],
      day: isoMatch[3],
    }
  }

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return {
    year: String(parsed.getFullYear()),
    month: pad2(parsed.getMonth() + 1),
    day: pad2(parsed.getDate()),
  }
}

export const formatDateEU = (value, fallback = '-') => {
  const parts = toDateParts(value)
  if (!parts) {
    return fallback
  }
  return `${parts.day}/${parts.month}/${parts.year}`
}

export const formatDateTimeEUFromEpochSeconds = (value, fallback = '-') => {
  if (!value) {
    return fallback
  }

  const seconds = Number(value)
  if (!Number.isFinite(seconds)) {
    return fallback
  }

  const parsed = new Date(seconds * 1000)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }

  const datePart = `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`
  const timePart = `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}:${pad2(parsed.getSeconds())}`
  return `${datePart} ${timePart}`
}
