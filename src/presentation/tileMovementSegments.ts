import type { Position, TileMovement } from '@/domain/types'

export type TileMovementSegment = {
  position: Position
  steps: number
}

type SegmentBuilder = {
  direction: Position
  previous: Position
  segments: TileMovementSegment[]
  steps: number
}

const getDirection = (from: Position, to: Position): Position => ({
  row: Math.sign(to.row - from.row),
  column: Math.sign(to.column - from.column),
})

const isSameDirection = (first: Position, second: Position): boolean => (
  first.row === second.row && first.column === second.column
)

const appendPosition = (builder: SegmentBuilder, position: Position): void => {
  const nextDirection = getDirection(builder.previous, position)

  if (builder.steps > 0 && !isSameDirection(builder.direction, nextDirection)) {
    builder.segments.push({ position: builder.previous, steps: builder.steps })
    builder.direction = nextDirection
    builder.steps = 0
  }
  builder.previous = position
  builder.steps++
}

export const getTileMovementSegments = (
  origin: Position,
  path: TileMovement['path']
): TileMovementSegment[] => {
  const builder: SegmentBuilder = {
    direction: getDirection(origin, path[0]),
    previous: origin,
    segments: [],
    steps: 0,
  }

  path.forEach(position => appendPosition(builder, position))
  return [...builder.segments, { position: builder.previous, steps: builder.steps }]
}
