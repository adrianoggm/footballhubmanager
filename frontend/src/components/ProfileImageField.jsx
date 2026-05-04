import { Box, Button, Stack, Typography } from '@mui/material'
import { useRef, useState } from 'react'
import { prepareProfileImageFile } from '../utils/profileImage.js'

export default function ProfileImageField({
  value = '',
  alt = '',
  label = '',
  helperText = '',
  chooseLabel = '',
  replaceLabel = '',
  removeLabel = '',
  emptyLabel = '',
  processingLabel = 'Processing image...',
  disabled = false,
  onChange,
  onError,
}) {
  const inputRef = useRef(null)
  const [processing, setProcessing] = useState(false)
  const hasValue = Boolean(String(value || '').trim())

  const handleOpenPicker = () => {
    if (disabled || processing) {
      return
    }
    inputRef.current?.click()
  }

  const handleRemove = () => {
    onChange?.('')
  }

  const handleSelectFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    setProcessing(true)
    try {
      const prepared = await prepareProfileImageFile(file)
      onChange?.(prepared.dataUrl)
    } catch (error) {
      onError?.(error)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Stack spacing={1}>
      {label ? (
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
      ) : null}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Box
          sx={{
            width: 108,
            height: 108,
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          {hasValue ? (
            <Box
              component="img"
              src={value}
              alt={alt || label || 'Profile image'}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 1.2, textAlign: 'center', lineHeight: 1.3 }}
            >
              {emptyLabel}
            </Typography>
          )}
        </Box>

        <Stack spacing={0.8} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={handleSelectFile}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" onClick={handleOpenPicker} disabled={disabled || processing}>
              {hasValue ? replaceLabel : chooseLabel}
            </Button>
            <Button
              variant="text"
              color="inherit"
              onClick={handleRemove}
              disabled={disabled || processing || !hasValue}
            >
              {removeLabel}
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {processing ? processingLabel : helperText}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  )
}
