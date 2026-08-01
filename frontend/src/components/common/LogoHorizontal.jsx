import { Box } from '@mui/material'
import logoHorizontalUrl from '../../assets/logo-horizontal.svg'

export default function LogoHorizontal({ height = 28, sx = {}, ...props }) {
  return (
    <Box
      role="img"
      aria-label="footballhubmanager"
      sx={{
        height,
        width: 'auto',
        aspectRatio: '4348.06 / 888.89',
        bgcolor: 'text.primary',
        maskImage: `url(${logoHorizontalUrl})`,
        WebkitMaskImage: `url(${logoHorizontalUrl})`,
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...sx,
      }}
      {...props}
    />
  )
}
