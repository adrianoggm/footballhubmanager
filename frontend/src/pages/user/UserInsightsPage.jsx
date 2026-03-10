import UserDashboardRoutePage from '../UserDashboardRoutePage.jsx'

export default function UserInsightsPage({ session, onLogout }) {
  return <UserDashboardRoutePage session={session} onLogout={onLogout} sectionId="insights" />
}
