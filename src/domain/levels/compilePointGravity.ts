import type {
  BoardTopology,
  CellKey,
  Direction,
  GravityEdgeTargetDefinition,
  GravityGraph,
} from '@/domain/levels/types'
import type { LevelCompilationError } from '@/domain/levels/errors'
import type { Position } from '@/domain/types'
import type { SpawnDefinition } from '@/domain/levels/types'

import { compileGravityGraph } from '@/domain/levels/gravityGraph'
import {
  DIRECTIONS,
  getNeighborKeys,
  getVirtualTarget,
} from '@/domain/levels/gravityGeometry'
import { isValidAnchor } from '@/domain/levels/gravityGeometry'
import { levelError } from '@/domain/levels/errors'
import { parseCellKey } from '@/domain/levels/coordinates'

type PointDefinition = Extract<import('@/domain/levels/types').GravityDefinition, { kind: 'point' }>

const getDistance = (a: Position, b: Position): number => (
  Math.abs(a.row - b.row) + Math.abs(a.column - b.column)
)

const getTerminalKeys = (topology: BoardTopology, target: Position): CellKey[] => {
  const distances = [...topology.playableCells].map(key => ({
    key,
    distance: getDistance(parseCellKey(key), target),
  }))
  const minimum = Math.min(...distances.map(item => item.distance))

  return distances.filter(item => item.distance === minimum).map(item => item.key)
}

const getDistances = (topology: BoardTopology, terminals: readonly CellKey[]): Map<CellKey, number> => {
  const distances = new Map<CellKey, number>(terminals.map(key => [key, 0]))
  const queue = [...terminals]

  while (queue.length > 0) {
    const key = queue.shift()!
    const distance = distances.get(key)!

    getNeighborKeys(parseCellKey(key)).forEach(([, neighbor]) => {
      if (topology.playableCells.has(neighbor) && !distances.has(neighbor)) {
        distances.set(neighbor, distance + 1)
        queue.push(neighbor)
      }
    })
  }
  return distances
}

const getTieBreakErrors = (tieBreak: readonly Direction[]): LevelCompilationError[] => {
  const unique = new Set(tieBreak)
  const valid = tieBreak.length === DIRECTIONS.length && DIRECTIONS.every(direction => unique.has(direction))

  return valid ? [] : [levelError(
    'invalid-gravity-edge',
    ['gravity', 'tieBreak'],
    'Point gravity tieBreak must contain each direction exactly once'
  )]
}

const isCloserNeighbor = (
  candidate: CellKey | undefined,
  topology: BoardTopology,
  distances: ReadonlyMap<CellKey, number>,
  distance: number
): candidate is CellKey => candidate !== undefined &&
  topology.playableCells.has(candidate) && distances.get(candidate) === distance - 1

const selectNext = (
  key: CellKey,
  topology: BoardTopology,
  distances: ReadonlyMap<CellKey, number>,
  tieBreak: readonly Direction[]
): CellKey | null => {
  const distance = distances.get(key)

  if (distance === undefined) {
    return null
  }
  const candidates = new Map(getNeighborKeys(parseCellKey(key)))
  const direction = tieBreak.find(item => (
    isCloserNeighbor(candidates.get(item), topology, distances, distance)
  ))

  return direction === undefined ? null : candidates.get(direction) ?? null
}

const getAnchorErrors = (
  topology: BoardTopology,
  definition: PointDefinition
): LevelCompilationError[] => isValidAnchor(definition.target, topology.bounds) ? [] : [levelError(
  'invalid-edge-target',
  ['gravity', 'target'],
  'Point gravity target must lie on the board boundary'
)]

const compilePointGraph = (
  topology: BoardTopology,
  definition: PointDefinition,
  tieBreak: readonly Direction[]
) => {
  const target = getVirtualTarget(definition.target, topology.bounds)
  const terminals = getTerminalKeys(topology, target)
  const distances = getDistances(topology, terminals)
  const nextByCell = new Map([...topology.playableCells].map(key => [
    key,
    selectNext(key, topology, distances, tieBreak),
  ]))

  return { terminals, nextByCell }
}

export const compilePointGravity = (
  topology: BoardTopology,
  definition: PointDefinition,
  spawns: readonly SpawnDefinition[]
): { gravity: GravityGraph; edgeTargets: GravityEdgeTargetDefinition[]; errors: LevelCompilationError[] } => {
  const anchorErrors = getAnchorErrors(topology, definition)
  const tieBreakErrors = getTieBreakErrors(definition.tieBreak)
  const tieBreak = tieBreakErrors.length === 0 ? definition.tieBreak : DIRECTIONS
  const point = compilePointGraph(topology, definition, tieBreak)
  const compiled = compileGravityGraph(topology, point.nextByCell, spawns)

  return {
    gravity: compiled.gravity,
    edgeTargets: [{
      anchor: definition.target,
      terminals: point.terminals as [CellKey, ...CellKey[]],
    }],
    errors: [...anchorErrors, ...tieBreakErrors, ...compiled.errors],
  }
}
