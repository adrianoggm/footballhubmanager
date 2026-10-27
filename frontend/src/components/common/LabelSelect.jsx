import { MenuItem, TextField } from '@mui/material'
import { translateLabel } from '../../i18n/labels.js'

const hasLabel = (options, value) => {
  const needle = String(value || '')
    .trim()
    .toLowerCase()
  return options.some((option) => String(option || '').toLowerCase() === needle)
}

// Role/position select restricted to the pena's configured labels. An
// out-of-catalog current value (legacy free-text label) stays selectable so it
// is not silently dropped, but no new free-text value can be entered. Known
// default labels are translated for display; values stay raw. Without
// `noneLabel` there is no empty option (roles: a membership always has one).
export default function LabelSelect({ label, noneLabel, value, onChange, options, kind, t }) {
  const safeOptions = options || []
  return (
    <TextField select label={label} value={value} onChange={onChange} fullWidth>
      {noneLabel ? <MenuItem value="">{noneLabel}</MenuItem> : null}
      {value && !hasLabel(safeOptions, value) && (
        <MenuItem value={value}>{translateLabel(t, kind, value)}</MenuItem>
      )}
      {safeOptions.map((option) => (
        <MenuItem key={option} value={option}>
          {translateLabel(t, kind, option)}
        </MenuItem>
      ))}
    </TextField>
  )
}
