const VALID_ACCOUNTABILITY_VISIBILITY_LEVELS = new Set(['private', 'summary', 'full'])

const normalizeVisibility = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return VALID_ACCOUNTABILITY_VISIBILITY_LEVELS.has(normalized) ? normalized : 'summary'
}

export const resolveBudgetVisibility = (accountability) =>
  normalizeVisibility(accountability?.budget_visibility ?? accountability?.transparency?.budget)

export const resolveExpensesVisibility = (accountability) =>
  normalizeVisibility(accountability?.expenses_visibility ?? accountability?.transparency?.expenses)
