import type { ObjectiveCollection } from '@/entities/Match3ObjectiveCollection'
import type { ObjectiveType } from '@/enums/game'

export type ObjectiveFlightPhase = 'ready' | 'dropping' | 'flying'
type Point = { x: number, y: number }

export type ObjectiveFlight = {
  id: string
  type: ObjectiveType
  from: Point
  drop: Point
  to: Point
  size: number
  targetScale: number
  phase: ObjectiveFlightPhase
}

const HALF = 0.5
const TILE_SIZE_RATIO = 0.9
const MUG_EDGE_OVERFLOW_RATIO = 0.15

export const createObjectiveFlight = (
  boardWidth: number,
  collection: ObjectiveCollection
): ObjectiveFlight | null => {
  const source = getSourceElement(boardWidth, collection)
  const target = getTargetElement(collection.type)
  const ground = document.querySelector<HTMLElement>('.b-game-ground')

  return source && target && ground
    ? getFlight(collection, source, target, ground)
    : null
}

export const getObjectiveFlightStyle = (flight: ObjectiveFlight) => {
  const position = getFlightPosition(flight)
  const scale = flight.phase === 'flying' ? flight.targetScale : 1

  return {
    '--objective-flight-size': `${flight.size}px`,
    transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
  }
}

const getFlight = (collection: ObjectiveCollection, source: HTMLElement, target: HTMLElement,
  ground: HTMLElement): ObjectiveFlight => {
  const sourceRect = source.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const size = Math.min(sourceRect.width, sourceRect.height) * TILE_SIZE_RATIO

  return {
    id: `${collection.type}-${collection.tileId}`,
    type: collection.type,
    from: centerElement(sourceRect, size),
    drop: getDropPoint(sourceRect, ground.getBoundingClientRect(), size),
    to: centerElement(targetRect, size),
    size,
    targetScale: Math.min(1, targetRect.width / size),
    phase: 'ready',
  }
}

const getSourceElement = (
  boardWidth: number,
  collection: ObjectiveCollection
): HTMLElement | undefined => {
  const index = collection.position.row * boardWidth + collection.position.column

  return [...document.querySelectorAll<HTMLElement>('.b-game-ground__cell')][index]
}

const getTargetElement = (type: ObjectiveType): HTMLElement | null => {
  return document.querySelector<HTMLElement>(
    `[data-objective-type="${type}"] .b-game-menu__objective-tile`
  )
}

const centerElement = (rect: DOMRect, size: number): Point => ({
  x: rect.left + (rect.width - size) * HALF,
  y: rect.top + (rect.height - size) * HALF,
})

const getDropPoint = (source: DOMRect, ground: DOMRect, size: number): Point => ({
  x: source.left + (source.width - size) * HALF,
  y: ground.bottom - size + size * MUG_EDGE_OVERFLOW_RATIO,
})

const getFlightPosition = (flight: ObjectiveFlight): Point => {
  if (flight.phase === 'flying') {
    return flight.to
  }

  return flight.phase === 'dropping' ? flight.drop : flight.from
}
