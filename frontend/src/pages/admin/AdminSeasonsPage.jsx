import AdminDashboardRoutePage from '../AdminDashboardRoutePage.jsx'

export default function AdminSeasonsPage({ session, onLogout }) {
  return <AdminDashboardRoutePage session={session} onLogout={onLogout} sectionId="seasons" />
}
