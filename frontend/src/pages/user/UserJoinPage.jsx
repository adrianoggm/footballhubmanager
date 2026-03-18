import UserDashboardRoutePage from '../UserDashboardRoutePage.jsx'

export default function UserJoinPage({ session, onLogout }) {
  return <UserDashboardRoutePage session={session} onLogout={onLogout} sectionId="join" />
}
