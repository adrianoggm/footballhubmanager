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

// Ledger rows a member may list: income needs budget = full, expenses need
// expenses = full (mirrors the backend AccountabilityAccess policy).
export const memberLedgerTypes = (budgetVisibility, expensesVisibility) => [
  ...(budgetVisibility === 'full' ? ['income'] : []),
  ...(expensesVisibility === 'full' ? ['expense'] : []),
]
