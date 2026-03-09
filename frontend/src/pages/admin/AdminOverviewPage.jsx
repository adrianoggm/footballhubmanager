import AdminDashboardRoutePage from '../AdminDashboardRoutePage.jsx'

export default function AdminOverviewPage({ session, onLogout }) {
  return <AdminDashboardRoutePage session={session} onLogout={onLogout} sectionId="overview" />
}
