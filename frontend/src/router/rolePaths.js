export const resolveRoleHomePath = (session) => {
  const role = String(session?.user_type || '').toLowerCase()
  if (role === 'admin') {
    return '/app/admin'
  }
  if (role === 'user') {
    return '/app/user'
  }
  return '/app/session-incomplete'
}
