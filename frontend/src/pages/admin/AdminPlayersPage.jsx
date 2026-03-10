import AdminDashboardRoutePage from '../AdminDashboardRoutePage.jsx'

export default function AdminPlayersPage({ session, onLogout }) {
  return <AdminDashboardRoutePage session={session} onLogout={onLogout} sectionId="players" />
}
