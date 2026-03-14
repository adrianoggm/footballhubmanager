import AdminDashboardRoutePage from '../AdminDashboardRoutePage.jsx'

export default function AdminAccountabilityPage({ session, onLogout }) {
  return (
    <AdminDashboardRoutePage session={session} onLogout={onLogout} sectionId="accountability" />
  )
}
