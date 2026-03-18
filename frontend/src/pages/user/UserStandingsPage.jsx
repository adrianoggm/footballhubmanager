import UserDashboardRoutePage from '../UserDashboardRoutePage.jsx'

export default function UserStandingsPage({ session, onLogout }) {
  return <UserDashboardRoutePage session={session} onLogout={onLogout} sectionId="standings" />
}
