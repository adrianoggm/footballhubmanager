// Goalkeeper-rotation alarm. Generates an audible pulsing beep with the Web Audio
// API so no audio asset has to be bundled. `playGoalkeeperAlarm` returns a stop()
// function that silences the alarm early (e.g. when the admin acknowledges it).

let sharedContext = null

const getAudioContext = () => {
  if (typeof window === 'undefined') {
    return null
  }
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) {
    return null
  }
  if (!sharedContext) {
    sharedContext = new Ctx()
  }
  return sharedContext
}

export const playGoalkeeperAlarm = (durationMs = 5000) => {
  const ctx = getAudioContext()
  if (!ctx) {
    return () => {}
  }
  // Browsers keep the context suspended until a user gesture; the admin already
  // interacted with the live tracking controls, so resuming here is permitted.
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  const gain = ctx.createGain()
  gain.gain.value = 0.0001
  gain.connect(ctx.destination)

  const oscillator = ctx.createOscillator()
  oscillator.type = 'square'
  oscillator.frequency.value = 880
  oscillator.connect(gain)

  const start = ctx.currentTime
  const total = Math.max(0, durationMs) / 1000
  const beep = 0.25 // seconds the tone is audible
  const period = 0.5 // beep + silence

  // Schedule repeated short beeps for the whole duration.
  for (let offset = 0; offset < total; offset += period) {
    const at = start + offset
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
    gain.gain.setValueAtTime(0.25, at + beep - 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + beep)
  }

  oscillator.start(start)
  oscillator.stop(start + total)

  let stopped = false
  const cleanup = () => {
    oscillator.disconnect()
    gain.disconnect()
  }
  oscillator.onended = cleanup

  return () => {
    if (stopped) {
      return
    }
    stopped = true
    try {
      gain.gain.cancelScheduledValues(ctx.currentTime)
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      oscillator.stop(ctx.currentTime)
    } catch {
      // The oscillator may have already finished; ignore.
    }
    cleanup()
  }
}
