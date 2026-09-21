import type {
  BoardTopology,
  CellKey,
  Direction,
  PointGravityZoneDefinition,
} from '@/domain/levels/types'
import type { Position } from '@/domain/types'

import { getPointGravityNeighbors } from '@/domain/levels/pointGravityNeighbors'
import { getVirtualTarget } from '@/domain/levels/gravityGeometry'
import { parseCellKey } from '@/domain/levels/coordinates'

export type PointZoneGraph = {
  distances: ReadonlyMap<CellKey, number>
  nextByCell: ReadonlyMap<CellKey, CellKey | null>
  terminals: readonly CellKey[]
}

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

    getPointGravityNeighbors(topology, parseCellKey(key)).forEach(neighbor => {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, distance + 1)
        queue.push(neighbor)
      }
    })
  }
  return distances
}

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
  const candidates = getPointGravityNeighbors(topology, parseCellKey(key), tieBreak)

  return candidates.find(candidate => distances.get(candidate) === distance - 1) ?? null
}

export const createPointZoneGraph = (
  topology: BoardTopology,
  zone: PointGravityZoneDefinition
): PointZoneGraph => {
  const target = getVirtualTarget(zone.target, topology.bounds)
  const terminals = getTerminalKeys(topology, target)
  const distances = getDistances(topology, terminals)
  const nextByCell = new Map([...topology.playableCells].map(key => [
    key,
    selectNext(key, topology, distances, zone.tieBreak),
  ]))

  return { distances, nextByCell, terminals }
}

export const getPointZoneRoots = (graph: PointZoneGraph): CellKey[] => {
  const incoming = new Set([...graph.nextByCell.values()].filter((key): key is CellKey => key !== null))

  return [...graph.nextByCell.keys()].filter(key => !incoming.has(key))
}
