import { Box, Button, Stack, Typography } from '@mui/material'
import { useState } from 'react'

import { ConfirmDialog, StatCard } from '../common'
import { EditMembershipDialog, EditSeasonPlayerDialog } from './PlayerEditDialogs.jsx'
import AddSeasonPlayersDialog from './players/AddSeasonPlayersDialog.jsx'
import ClaimLinkDialog from './players/ClaimLinkDialog.jsx'
import LabelsDialog from './players/LabelsDialog.jsx'
import NewPlayerDialog from './players/NewPlayerDialog.jsx'
import PlayerList from './players/PlayerList.jsx'
import PlayerToolbar from './players/PlayerToolbar.jsx'
import { filterPlayers, paginate, sortPlayers } from './players/playersHelpers.js'

const PAGE_SIZE = 10
const ACCENT = '#FCB491'

// Header action buttons share the peach accent used for nicknames / "add to season".
const headerButtonSx = {
  color: ACCENT,
  borderColor: ACCENT,
  '&:hover': { borderColor: ACCENT, backgroundColor: 'rgba(252, 180, 145, 0.08)' },
}

const HeaderIcon = ({ name }) => (
  <Box component="span" className="material-symbols-rounded">
    {name}
  </Box>
)

/**
 * Player Directory (issue #147, task 8): a single filterable/sortable list of
 * pena members with season membership rendered as a STATUS column, plus the
 * header actions and every player dialog. All data + mutations live in
 * `useAdminPlayers` (passed in as `adminPlayers`); this section only composes
 * the already-built presentational pieces and owns the three header dialogs'
 * open/close booleans.
 */
export default function AdminPlayersSection({
  adminPlayers,
  selectedSeasonGuid,
  nationalities,
  penaLabels,
  t,
  formatPlayerDisplayName,
  formatEpochSeconds,
}) {
  const [addSeasonOpen, setAddSeasonOpen] = useState(false)
  const [newPlayerOpen, setNewPlayerOpen] = useState(false)
  const [labelsOpen, setLabelsOpen] = useState(false)

  const { state, actions, toolbar, toolbarActions } = adminPlayers
  const loading = state.loading

  const roleOptions = penaLabels.role_labels || []
  const positionOptions = penaLabels.position_labels || []

  const filtered = sortPlayers(
    filterPlayers(
      adminPlayers.players,
      {
        search: toolbar.search,
        roles: toolbar.roleFilter,
        positions: toolbar.positionFilter,
        status: toolbar.statusFilter,
      },
      adminPlayers.seasonRosterGuids
    ),
    toolbar.sort,
    adminPlayers.seasonRosterGuids
  )
  const paged = paginate(filtered, toolbar.page, PAGE_SIZE)

  const handleRowAction = (key, player) => {
    switch (key) {
      case 'edit':
        actions.handleEditMembershipPlayer(player)
        break
      case 'editStats':
        actions.handleEditSeasonPlayer(player)
        break
      case 'addToSeason':
        actions.handleRegisterSinglePlayerInSeason(player.guid)
        break
      case 'removeFromSeason':
        actions.handleRequestRemoveSeasonPlayer(player)
        break
      case 'invite':
        actions.handleGenerateClaimLink(player)
        break
      case 'remove':
        actions.handleRequestRemoveMembershipPlayer(player)
        break
      default:
        break
    }
  }

  const confirmState = adminPlayers.confirmState
  const isSeasonConfirm = confirmState?.kind === 'season'
  const confirmPlayerName = confirmState
    ? isSeasonConfirm
      ? formatPlayerDisplayName(confirmState.player)
      : [confirmState.player.name, confirmState.player.surname1, confirmState.player.surname2]
          .filter(Boolean)
          .join(' ')
    : ''

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {t('dashboard.admin.directory.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.admin.directory.subtitle')}
        </Typography>
      </Box>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            onClick={() => setAddSeasonOpen(true)}
            disabled={!selectedSeasonGuid}
            startIcon={<HeaderIcon name="group_add" />}
            sx={headerButtonSx}
          >
            {t('dashboard.admin.directory.btnAddSeasonPlayers')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setNewPlayerOpen(true)}
            startIcon={<HeaderIcon name="person_add" />}
            sx={headerButtonSx}
          >
            {t('dashboard.admin.directory.btnAddNewPlayer')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setLabelsOpen(true)}
            startIcon={<HeaderIcon name="sell" />}
            sx={headerButtonSx}
          >
            {t('dashboard.admin.directory.btnTagConfig')}
          </Button>
        </Stack>

        <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
          <StatCard
            label={t('dashboard.admin.directory.statRegisteredLabel')}
            value={adminPlayers.players.length}
            icon="groups"
            accent={ACCENT}
          />
        </Box>
      </Stack>

      <PlayerToolbar
        toolbar={toolbar}
        actions={toolbarActions}
        roleOptions={roleOptions}
        positionOptions={positionOptions}
        t={t}
      />

      <PlayerList
        pageItems={paged.pageItems}
        seasonRosterGuids={adminPlayers.seasonRosterGuids}
        total={paged.total}
        shown={paged.shown}
        page={toolbar.page}
        pageCount={paged.pageCount}
        onPageChange={toolbarActions.setPage}
        onAddToSeason={(player) => actions.handleRegisterSinglePlayerInSeason(player.guid)}
        onRowAction={handleRowAction}
        t={t}
        formatPlayerDisplayName={formatPlayerDisplayName}
        penaLabels={penaLabels}
        seasonSelected={Boolean(selectedSeasonGuid)}
      />

      <AddSeasonPlayersDialog
        open={addSeasonOpen}
        onClose={() => setAddSeasonOpen(false)}
        availablePlayers={state.availableHistoricalPlayers}
        selectedGuids={state.selectedHistoricalGuids}
        onSelect={actions.handleSelectHistoricalPlayers}
        onAdd={async () => {
          const ok = await actions.handleRegisterHistoricalPlayersInSeason()
          if (ok !== false) setAddSeasonOpen(false)
        }}
        formatPlayerDisplayName={formatPlayerDisplayName}
        registeredCount={state.seasonRoster.length}
        availableCount={state.availableHistoricalPlayers.length}
        t={t}
      />

      <NewPlayerDialog
        open={newPlayerOpen}
        onClose={() => setNewPlayerOpen(false)}
        guestForm={state.guestForm}
        onGuestField={actions.onGuestField}
        nationalities={nationalities}
        roleOptions={roleOptions}
        positionOptions={positionOptions}
        onCreate={async (addToSeason) => {
          const ok = await actions.handleCreateGuestPlayer(addToSeason)
          if (ok !== false) setNewPlayerOpen(false)
        }}
        t={t}
      />

      <LabelsDialog
        open={labelsOpen}
        onClose={() => setLabelsOpen(false)}
        labelsDraft={state.labelsDraft}
        draftRoleLabels={state.draftRoleLabels}
        draftPositionLabels={state.draftPositionLabels}
        draftRoleColors={state.draftRoleColors}
        draftPositionColors={state.draftPositionColors}
        onLabelsDraftField={actions.onLabelsDraftField}
        onLabelColorDraftChange={actions.onLabelColorDraftChange}
        onSave={async () => {
          const ok = await actions.handleSavePenaLabels()
          if (ok !== false) setLabelsOpen(false)
        }}
        t={t}
      />

      <ClaimLinkDialog
        open={Boolean(adminPlayers.claimLinkPayload)}
        onClose={actions.onCloseClaimLink}
        claimLinkPayload={adminPlayers.claimLinkPayload}
        formatEpochSeconds={formatEpochSeconds}
        formatPlayerDisplayName={formatPlayerDisplayName}
        t={t}
      />

      <EditSeasonPlayerDialog
        player={adminPlayers.editingSeasonPlayer}
        draft={adminPlayers.seasonPlayerDraft}
        onField={adminPlayers.onSeasonPlayerDraftField}
        onClose={adminPlayers.closeEditSeason}
        onSave={adminPlayers.saveSeasonPlayer}
        penaLabels={penaLabels}
        loading={loading}
        t={t}
        formatPlayerDisplayName={formatPlayerDisplayName}
      />

      <EditMembershipDialog
        player={adminPlayers.editingMembershipPlayer}
        draft={adminPlayers.membershipDraft}
        onField={adminPlayers.onMembershipDraftField}
        onClose={adminPlayers.closeEditMembership}
        onSave={adminPlayers.saveMembershipPlayer}
        penaLabels={penaLabels}
        loading={loading}
        t={t}
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        onCancel={adminPlayers.cancelConfirm}
        onConfirm={adminPlayers.confirmRemove}
        title={
          isSeasonConfirm
            ? t('dashboard.admin.players.removeSeasonPlayerTitle')
            : t('dashboard.admin.members.removeTitle')
        }
        description={
          confirmState
            ? isSeasonConfirm
              ? t('dashboard.admin.players.removeSeasonPlayerConfirm', {
                  player: confirmPlayerName,
                })
              : t('dashboard.admin.members.removeConfirm', { player: confirmPlayerName })
            : ''
        }
        cancelLabel={
          isSeasonConfirm
            ? t('dashboard.admin.players.cancelRemoveSeasonPlayer')
            : t('dashboard.admin.members.cancelRemove')
        }
        confirmLabel={
          isSeasonConfirm
            ? t('dashboard.admin.players.removeFromSeason')
            : t('dashboard.admin.members.remove')
        }
        loading={loading}
      />
    </Stack>
  )
}
