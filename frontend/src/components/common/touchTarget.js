// U-13: tappable controls get at least a 40px touch area on phones (xs) while
// keeping their compact desktop size from `sm` up.

/** For icon buttons / small buttons. */
export const touchTargetSx = {
  minWidth: { xs: 40, sm: 0 },
  minHeight: { xs: 40, sm: 0 },
}

/** For inline text links (keeps the text size, grows the hit area). */
export const touchTargetLinkSx = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: { xs: 40, sm: 0 },
}

/** For small clickable chips (24px tall by default). */
export const touchTargetChipSx = {
  height: { xs: 40, sm: 24 },
  borderRadius: { xs: 20, sm: 12 },
}
