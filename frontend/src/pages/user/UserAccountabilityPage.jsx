import UserDashboardRoutePage from '../UserDashboardRoutePage.jsx'

export default function UserAccountabilityPage({ session, onLogout }) {
  return <UserDashboardRoutePage session={session} onLogout={onLogout} sectionId="accountability" />
}
