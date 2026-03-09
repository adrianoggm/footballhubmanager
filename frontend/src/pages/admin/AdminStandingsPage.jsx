import AdminDashboardRoutePage from '../AdminDashboardRoutePage.jsx'

export default function AdminStandingsPage({ session, onLogout }) {
  return <AdminDashboardRoutePage session={session} onLogout={onLogout} sectionId="standings" />
}
