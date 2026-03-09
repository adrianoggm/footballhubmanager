import AdminDashboardRoutePage from '../AdminDashboardRoutePage.jsx'

export default function AdminMatchesPage({ session, onLogout }) {
  return <AdminDashboardRoutePage session={session} onLogout={onLogout} sectionId="matches" />
}
