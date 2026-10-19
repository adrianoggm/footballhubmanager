import { Button } from '@mui/material'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
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
  const { section } = useParams()

  if (!isLegalDocument(section)) {
    return <Navigate to={legalPath('terms')} replace />
  }

  return (
    <LegalDocument
      document={section}
      action={
        <Button variant="outlined" onClick={() => navigate(-1)}>
          {t('legal.back')}
        </Button>
      }
    />
  )
}
