// Display-layer translation for player role/position labels.
//
// Role/position labels are pena-scoped DATA (admins can customize them), stored
// as raw strings (the defaults are English: 'president', 'keeper', ...). Rendering
// them verbatim mixes languages with the UI. This helper translates the KNOWN
// default labels through the i18n catalog (`labels.role.*` / `labels.position.*`)
// and falls back to the raw value for custom labels. It must only ever be used
// for display — select values / filter keys keep the raw label.

const normalizeLabelKey = (label) =>
  String(label || '')
    .trim()
    .toLowerCase()

export const translateLabel = (t, kind, label) => {
  const key = normalizeLabelKey(label)
  if (!key) {
    return label
  }
  const i18nKey = `labels.${kind === 'position' ? 'position' : 'role'}.${key}`
  const translated = t(i18nKey)
  // The i18n helper returns the key itself when no translation exists
  // (custom pena labels) — show the raw label in that case.
  return translated === i18nKey ? label : translated
}

export const translateRoleLabel = (t, label) => translateLabel(t, 'role', label)
export const translatePositionLabel = (t, label) => translateLabel(t, 'position', label)
