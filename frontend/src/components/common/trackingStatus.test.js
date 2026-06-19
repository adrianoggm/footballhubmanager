import { describe, expect, it } from 'vitest'

import {
  isLiveTrackingStatus,
  isPausedTrackingStatus,
  trackingChipColor,
  trackingLabel,
} from './trackingStatus.js'

describe('isLiveTrackingStatus', () => {
  it('treats live and in_progress (any case) as live', () => {
    expect(isLiveTrackingStatus('live')).toBe(true)
    expect(isLiveTrackingStatus('in_progress')).toBe(true)
    expect(isLiveTrackingStatus('LIVE')).toBe(true)
    expect(isLiveTrackingStatus(' In_Progress ')).toBe(true)
  })

  it('is false for other / empty / nullish values', () => {
    expect(isLiveTrackingStatus('paused')).toBe(false)
    expect(isLiveTrackingStatus('finished')).toBe(false)
    expect(isLiveTrackingStatus('')).toBe(false)
    expect(isLiveTrackingStatus(null)).toBe(false)
    expect(isLiveTrackingStatus(undefined)).toBe(false)
  })
})

describe('isPausedTrackingStatus', () => {
  it('matches only paused (any case)', () => {
    expect(isPausedTrackingStatus('paused')).toBe(true)
    expect(isPausedTrackingStatus('PAUSED')).toBe(true)
    expect(isPausedTrackingStatus('live')).toBe(false)
    expect(isPausedTrackingStatus(null)).toBe(false)
  })
})

describe('trackingChipColor', () => {
  it('maps each status to its MUI color', () => {
    expect(trackingChipColor('live')).toBe('success')
    expect(trackingChipColor('in_progress')).toBe('success')
    expect(trackingChipColor('paused')).toBe('warning')
    expect(trackingChipColor('finished')).toBe('info')
    expect(trackingChipColor('not_started')).toBe('default')
    expect(trackingChipColor(undefined)).toBe('default')
  })
})

describe('trackingLabel', () => {
  // t echoes its key so we can assert which message is selected.
  const t = (key) => key

  it('selects the right i18n key per status', () => {
    expect(trackingLabel('live', t)).toBe('dashboard.common.matchDetail.trackingLive')
    expect(trackingLabel('in_progress', t)).toBe('dashboard.common.matchDetail.trackingLive')
    expect(trackingLabel('paused', t)).toBe('dashboard.common.matchDetail.trackingPaused')
    expect(trackingLabel('finished', t)).toBe('dashboard.common.matchDetail.trackingFinished')
    expect(trackingLabel('not_started', t)).toBe('dashboard.common.matchDetail.trackingNotStarted')
  })
})
