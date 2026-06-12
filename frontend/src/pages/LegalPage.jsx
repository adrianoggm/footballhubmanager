import { Button } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '../components/common'
import { useI18n } from '../i18n/useI18n.js'

const KNOWN_SECTIONS = ['terms', 'privacy', 'accessibility']

/**
 * Placeholder for legal/info pages (terms, privacy, accessibility) so footer
 * links are real routes before launch. Replace the body with final copy when
 * the documents are ready.
 */
export default function LegalPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { section } = useParams()
  const resolved = KNOWN_SECTIONS.includes(section) ? section : 'terms'

  return (
    <EmptyState
      title={t(`legal.titles.${resolved}`)}
      description={t('legal.placeholderBody')}
      action={
        <Button variant="outlined" onClick={() => navigate(-1)}>
          {t('legal.back')}
        </Button>
      }
    />
  )
}
