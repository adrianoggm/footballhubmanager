import { Button } from '@mui/material'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import LegalDocument from '../components/legal/LegalDocument.jsx'
import { isLegalDocument, legalPath } from '../components/legal/legalDocuments.js'
import { useI18n } from '../i18n/useI18n.js'

/**
 * Public legal/info page (/legal/:section): contact, terms, privacy and
 * accessibility. Unknown sections redirect to the terms page.
 */
export default function LegalPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const { section } = useParams()

  // Opened directly (new tab, bookmark, emailed link) there is no in-app entry
  // to return to: navigate(-1) would leave the app, so go to the root instead,
  // which redirects to sign-in or to the user's dashboard.
  const goBack = () => {
    if (location.key === 'default') {
      navigate('/', { replace: true })
      return
    }
    navigate(-1)
  }

  if (!isLegalDocument(section)) {
    return <Navigate to={legalPath('terms')} replace />
  }

  return (
    <LegalDocument
      document={section}
      action={
        <Button variant="outlined" onClick={goBack}>
          {t('legal.back')}
        </Button>
      }
    />
  )
}
