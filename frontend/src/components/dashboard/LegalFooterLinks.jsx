import { useInRouterContext } from 'react-router-dom'
import AppFooter from '../common/AppFooter.jsx'

/**
 * Legal footer inside the settings dialogs: dashboards no longer render the
 * page footer (redesign F1), so contact/terms/privacy stay reachable here.
 * Skipped outside a router (component tests mount dashboards without one).
 */
export default function LegalFooterLinks() {
  const inRouter = useInRouterContext()
  return inRouter ? <AppFooter /> : null
}
