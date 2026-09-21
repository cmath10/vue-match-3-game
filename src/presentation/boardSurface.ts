import type { BoardTopology } from '@/domain/levels/types'
import type { GameCell } from '@/presentation/tiles'

import { createGameCell } from '@/presentation/tiles'

export type BoardSurface = {
  borderPath: string
  fillPath: string
  viewBox: string
}
enum SurfaceDirection {
  Right = 0,
  Down = 1,
  Left = 2,
  Up = 3,
}
enum SurfaceTurn {
  Straight = 0,
  Right = 1,
  Back = 2,
  Left = 3,
}
type SurfacePoint = { x: number, y: number }
type SurfaceEdge = {
  direction: SurfaceDirection
  end: SurfacePoint
  id: number
  start: SurfacePoint
}
const BOARD_SURFACE_MARGIN = 0.07
const BOARD_SURFACE_RADIUS = 0.1
const SEGMENT_RADIUS_LIMIT = 0.5
const SURFACE_DIRECTION_COUNT = 4
const TURN_PRIORITY = [
  SurfaceTurn.Right,
  SurfaceTurn.Straight,
  SurfaceTurn.Left,
  SurfaceTurn.Back,
]

const createEdge = (
  direction: SurfaceDirection,
  start: SurfacePoint,
  end: SurfacePoint
): SurfaceEdge => ({ direction, end, id: 0, start })

const getSurfaceEdges = (cell: GameCell): SurfaceEdge[] => {
  const left = cell.style.gridColumn - 1
  const top = cell.style.gridRow - 1

  return [
    cell.edges.top
      ? createEdge(SurfaceDirection.Right, { x: left, y: top }, { x: left + 1, y: top })
      : null,
    cell.edges.right
      ? createEdge(SurfaceDirection.Down, { x: left + 1, y: top }, { x: left + 1, y: top + 1 })
      : null,
    cell.edges.bottom
      ? createEdge(SurfaceDirection.Left, { x: left + 1, y: top + 1 }, { x: left, y: top + 1 })
      : null,
    cell.edges.left
      ? createEdge(SurfaceDirection.Up, { x: left, y: top + 1 }, { x: left, y: top })
      : null,
  ].filter(edge => edge !== null)
}

const getPointKey = (point: SurfacePoint): string => `${point.x}:${point.y}`
const isSamePoint = (first: SurfacePoint, second: SurfacePoint): boolean => (
  first.x === second.x && first.y === second.y
)
const getTurn = (current: SurfaceEdge, next: SurfaceEdge): number => (
  (next.direction - current.direction + SURFACE_DIRECTION_COUNT) % SURFACE_DIRECTION_COUNT
)
const getTurnPriority = (turn: number): number => TURN_PRIORITY.indexOf(turn)

const indexEdgesByStart = (edges: readonly SurfaceEdge[]): Map<string, SurfaceEdge[]> => {
  const indexed = new Map<string, SurfaceEdge[]>()

  edges.forEach((edge) => {
    const key = getPointKey(edge.start)

    indexed.set(key, [...(indexed.get(key) ?? []), edge])
  })
  return indexed
}

const getNextEdge = (
  current: SurfaceEdge,
  edgesByStart: ReadonlyMap<string, readonly SurfaceEdge[]>,
  unusedEdgeIds: ReadonlySet<number>
): SurfaceEdge => {
  const candidates = (edgesByStart.get(getPointKey(current.end)) ?? [])
    .filter(edge => unusedEdgeIds.has(edge.id))
    .sort((first, second) => (
      getTurnPriority(getTurn(current, first)) - getTurnPriority(getTurn(current, second))
    ))
  const next = candidates[0]

  if (next === undefined) {
    throw new Error(`Cannot close board surface at ${getPointKey(current.end)}`)
  }
  return next
}

const getRoundedPoint = (
  vertex: SurfacePoint,
  neighbor: SurfacePoint
): SurfacePoint => {
  const x = neighbor.x - vertex.x
  const y = neighbor.y - vertex.y
  const length = Math.hypot(x, y)
  const radius = Math.min(BOARD_SURFACE_RADIUS, length * SEGMENT_RADIUS_LIMIT)

  return { x: vertex.x + x / length * radius, y: vertex.y + y / length * radius }
}

const getOutwardNormal = (start: SurfacePoint, end: SurfacePoint): SurfacePoint => {
  const x = end.x - start.x
  const y = end.y - start.y
  const length = Math.hypot(x, y)

  return { x: y / length, y: -x / length }
}

const offsetContour = (vertices: readonly SurfacePoint[]): SurfacePoint[] => (
  vertices.map((vertex, index) => {
    const previous = vertices.at(index - 1) ?? vertices.at(-1)!
    const next = vertices[(index + 1) % vertices.length]
    const previousNormal = getOutwardNormal(previous, vertex)
    const nextNormal = getOutwardNormal(vertex, next)
    const straight = isSamePoint(previousNormal, nextNormal)

    return {
      x: vertex.x + (previousNormal.x + (straight ? 0 : nextNormal.x)) * BOARD_SURFACE_MARGIN,
      y: vertex.y + (previousNormal.y + (straight ? 0 : nextNormal.y)) * BOARD_SURFACE_MARGIN,
    }
  })
)

const createRoundedContour = (vertices: readonly SurfacePoint[]): string => {
  const corners = vertices.map((vertex, index) => ({
    entry: getRoundedPoint(vertex, vertices.at(index - 1) ?? vertices.at(-1)!),
    exit: getRoundedPoint(vertex, vertices[(index + 1) % vertices.length]),
    vertex,
  }))
  const first = corners[0]

  return `${corners.map((corner, index) => (
    `${index === 0 ? `M${corner.entry.x} ${corner.entry.y}` : `L${corner.entry.x} ${corner.entry.y}`}`
    + `Q${corner.vertex.x} ${corner.vertex.y} ${corner.exit.x} ${corner.exit.y}`
  )).join('')}L${first.entry.x} ${first.entry.y}Z`
}

const traceContour = (
  firstEdge: SurfaceEdge,
  edgesByStart: ReadonlyMap<string, readonly SurfaceEdge[]>,
  unusedEdgeIds: Set<number>
): string => {
  const vertices = [firstEdge.start]
  let edge = firstEdge

  do {
    unusedEdgeIds.delete(edge.id)
    if (!isSamePoint(edge.end, firstEdge.start)) {
      vertices.push(edge.end)
    }
    edge = isSamePoint(edge.end, firstEdge.start)
      ? firstEdge
      : getNextEdge(edge, edgesByStart, unusedEdgeIds)
  } while (edge !== firstEdge)

  return createRoundedContour(offsetContour(vertices))
}

const createSurfacePath = (cells: readonly GameCell[]): string => {
  const edges = cells.flatMap(getSurfaceEdges)
    .map((edge, id) => ({ ...edge, id }))
  const edgesByStart = indexEdgesByStart(edges)
  const unusedEdgeIds = new Set(edges.map(edge => edge.id))
  const contours: string[] = []

  edges.forEach((edge) => {
    if (unusedEdgeIds.has(edge.id)) {
      contours.push(traceContour(edge, edgesByStart, unusedEdgeIds))
    }
  })
  return contours.join('')
}

export const getBoardSurface = (topology: BoardTopology): BoardSurface => {
  const cells = [...topology.playableCells].map(key => createGameCell(topology, key))
  const surfacePath = createSurfacePath(cells)

  return {
    fillPath: surfacePath,
    borderPath: surfacePath,
    viewBox: `0 0 ${topology.bounds.width} ${topology.bounds.height}`,
  }
}
