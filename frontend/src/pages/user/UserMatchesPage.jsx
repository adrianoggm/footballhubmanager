import UserDashboardRoutePage from '../UserDashboardRoutePage.jsx'

export default function UserMatchesPage({ session, onLogout }) {
  return <UserDashboardRoutePage session={session} onLogout={onLogout} sectionId="matches" />
}
