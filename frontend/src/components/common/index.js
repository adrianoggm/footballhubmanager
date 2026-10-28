// Shared UI primitives. Import from this barrel:
//   import { EmptyState, ErrorState, LoadingState } from '../common'
export { default as ConfirmDialog } from './ConfirmDialog.jsx'
export { SkeletonKpis, SkeletonRows, SkeletonSection } from './ContentSkeleton.jsx'
export { default as EmptyState } from './EmptyState.jsx'
export { default as ErrorState } from './ErrorState.jsx'
export { default as FormDots } from './FormDots.jsx'
export { default as HeaderIconButton } from './HeaderIconButton.jsx'
export { default as Kpi } from './Kpi.jsx'
export { default as RatingBadge } from './RatingBadge.jsx'
export { default as SegmentedControl } from './SegmentedControl.jsx'
export { default as LabelSelect } from './LabelSelect.jsx'
export { default as LoadingState } from './LoadingState.jsx'
export { default as LogoHorizontal } from './LogoHorizontal.jsx'
export { default as PaginatedTable } from './PaginatedTable.jsx'
export { default as SectionHeader } from './SectionHeader.jsx'
export { default as StatCard } from './StatCard.jsx'
export { default as StatusChip } from './StatusChip.jsx'
export { default as ToastProvider } from './ToastProvider.jsx'
export {
  isLiveTrackingStatus,
  isPausedTrackingStatus,
  trackingChipColor,
  trackingLabel,
} from './trackingStatus.js'
export { buildFormSequence, formResultFromScore, normalizeFormResult } from './formResults.js'
export { getSurfaceGeometry } from './surfaceGeometry.js'
export { stickyLastColumnSx } from './responsiveTable.js'
export { touchTargetChipSx, touchTargetLinkSx, touchTargetSx } from './touchTarget.js'
