import type { ButtonFlight } from '@/composables/useButtonCollection'

import { BUTTON_PHASE_DURATIONS } from '@/composables/useButtonCollection'

const MIN_SEGMENTS = 4
const SEGMENTS_PER_CELL = 3
const ZIGZAG_PERIOD = 2
const BASE_AMPLITUDE = 0.09
const AMPLITUDE_VARIANTS = 5
const AMPLITUDE_STEP = 0.015

const LIGHTNING_TIMING_STYLE = {
  '--button-lightning-appear-duration': `${BUTTON_PHASE_DURATIONS.targeting}ms`,
  '--button-lightning-fade-duration': `${BUTTON_PHASE_DURATIONS.fading}ms`,
}

export const getButtonLightning = (flight: ButtonFlight) => {
  const column = Math.min(flight.from.column, flight.to.column)
  const row = Math.min(flight.from.row, flight.to.row)
  const dx = flight.from.column - flight.to.column
  const dy = flight.from.row - flight.to.row
  const width = Math.max(Math.abs(dx), 1)
  const height = Math.max(Math.abs(dy), 1)

  return {
    path: getLightningPath(flight.to.column - column, flight.to.row - row, dx, dy, flight.tileId),
    viewBox: `0 0 ${width} ${height}`,
    style: {
      ...LIGHTNING_TIMING_STYLE,
      left: `calc(${column} * (var(--cell-size) + var(--cell-gap)) + var(--cell-size) / 2)`,
      top: `calc(${row} * (var(--cell-size) + var(--cell-gap)) + var(--cell-size) / 2)`,
      width: `calc(${width} * (var(--cell-size) + var(--cell-gap)))`,
      height: `calc(${height} * (var(--cell-size) + var(--cell-gap)))`,
    },
  }
}

const getLightningPath = (x: number, y: number, dx: number, dy: number, seed: number): string => {
  const distance = Math.max(Math.hypot(dx, dy), 1)
  const steps = Math.max(MIN_SEGMENTS, Math.ceil(distance * SEGMENTS_PER_CELL))
  const points = [`M ${x} ${y}`]

  for (let step = 1; step < steps; step++) {
    const progress = step / steps
    const offset = Math.sin(progress * Math.PI) * (step % ZIGZAG_PERIOD === 0 ? -1 : 1) * (BASE_AMPLITUDE + (seed % AMPLITUDE_VARIANTS) * AMPLITUDE_STEP)

    points.push(`L ${x + dx * progress - dy / distance * offset} ${y + dy * progress + dx / distance * offset}`)
  }
  points.push(`L ${x + dx} ${y + dy}`)
  return points.join(' ')
}
