import UserDashboardRoutePage from '../UserDashboardRoutePage.jsx'

export default function UserMembershipPage({ session, onLogout }) {
  return <UserDashboardRoutePage session={session} onLogout={onLogout} sectionId="membership" />
}
