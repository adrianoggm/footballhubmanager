import { useState } from 'react'

import { adminService } from '../services/adminService.js'

export function useInvitations({ selectedPenaGuid, runAction, t }) {
  const [tokenPayload, setTokenPayload] = useState(null)
  const [claimLinkPayload, setClaimLinkPayload] = useState(null)

  const handleGenerateJoinCode = async () => {
    if (!selectedPenaGuid) {
      return
    }
    await runAction(async () => {
      const token = await adminService.createLinkToken(selectedPenaGuid)
      setTokenPayload(token)
    }, t('dashboard.admin.notices.joinCodeGenerated'))
  }

  const handleGenerateClaimLink = async (player) => {
    if (!selectedPenaGuid || !player?.guid) {
      return
    }
    await runAction(async () => {
      const token = await adminService.createClaimToken(selectedPenaGuid, player.guid)
      setClaimLinkPayload({ ...token, player })
    }, t('dashboard.admin.notices.claimLinkGenerated'))
  }

  const closeClaimLink = () => setClaimLinkPayload(null)

  return {
    tokenPayload,
    claimLinkPayload,
    handleGenerateJoinCode,
    handleGenerateClaimLink,
    closeClaimLink,
  }
}
