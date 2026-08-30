import type {
  BoardTopology,
  CellKey,
  GravityEdgeTargetDefinition,
  GravityGraph,
} from '@/domain/levels/types'
import type { LevelCompilationError } from '@/domain/levels/errors'
import type { SpawnDefinition } from '@/domain/levels/types'

import { compileGravityGraph } from '@/domain/levels/gravityGraph'
import { getNeighborKeys, isValidAnchor } from '@/domain/levels/gravityGeometry'
import { levelError } from '@/domain/levels/errors'
import { parseCellKey } from '@/domain/levels/coordinates'

type FlowDefinition = Extract<import('@/domain/levels/types').GravityDefinition, { kind: 'flow' }>

const isCellKey = (value: string): value is CellKey => /^\d+:\d+$/.test(value)

const getEdgeError = (key: string, message: string): LevelCompilationError => levelError(
  'invalid-gravity-edge',
  ['gravity', 'nextByCell', key],
  message
)

const getSourceErrors = (
  topology: BoardTopology,
  definition: FlowDefinition
): LevelCompilationError[] => Object.keys(definition.nextByCell).flatMap(key => (
  !isCellKey(key) || !topology.playableCells.has(key)
    ? [getEdgeError(key, `Gravity source ${key} must be a playable cell`)]
    : []
))

const compileCellNext = (
  topology: BoardTopology,
  definition: FlowDefinition,
  key: CellKey
): { next: CellKey | null; errors: LevelCompilationError[] } => {
  const next = definition.nextByCell[key]

  if (next === undefined) {
    return { next: null, errors: [getEdgeError(key, `Gravity source ${key} must define next or null`)] }
  }
  if (next === null || isValidNext(topology, key, next)) {
    return { next, errors: [] }
  }
  return {
    next: null,
    errors: [getEdgeError(key, `Gravity edge ${key} -> ${next} must join neighboring playable cells`)],
  }
}

const compileNext = (
  topology: BoardTopology,
  definition: FlowDefinition
): { nextByCell: Map<CellKey, CellKey | null>; errors: LevelCompilationError[] } => {
  const nextByCell = new Map<CellKey, CellKey | null>()
  const errors = getSourceErrors(topology, definition)

  topology.playableCells.forEach((key) => {
    const compiled = compileCellNext(topology, definition, key)

    nextByCell.set(key, compiled.next)
    errors.push(...compiled.errors)
  })
  return { nextByCell, errors }
}

const isValidNext = (topology: BoardTopology, source: CellKey, next: string): next is CellKey => (
  isCellKey(next) &&
  topology.playableCells.has(next) &&
  getNeighborKeys(parseCellKey(source)).some(([, neighbor]) => neighbor === next)
)

const getAnchorKey = (target: GravityEdgeTargetDefinition): string => (
  'column' in target.anchor
    ? `${target.anchor.side}:${target.anchor.column}`
    : `${target.anchor.side}:${target.anchor.row}`
)

const getUnboundTerminalErrors = (
  graph: GravityGraph,
  terminals: ReadonlySet<CellKey>
): LevelCompilationError[] => [...graph.nodes].flatMap(([key, node]) => (
  node.next === null && !terminals.has(key) ? [levelError(
    'invalid-edge-target',
    ['gravity', 'edgeTargets'],
    `Terminal cell ${key} must belong to an external edge target`
  )] : []
))

const validateTarget = (
  topology: BoardTopology,
  graph: GravityGraph,
  target: GravityEdgeTargetDefinition,
  index: number,
  anchors: Set<string>,
  terminals: Set<CellKey>
): LevelCompilationError[] => {
  const errors = getTargetErrors(
    topology, graph, target, ['gravity', 'edgeTargets', index], anchors, terminals
  )

  anchors.add(getAnchorKey(target))
  target.terminals.forEach(key => terminals.add(key))
  return errors
}

const validateEdgeTargets = (
  topology: BoardTopology,
  graph: GravityGraph,
  targets: readonly GravityEdgeTargetDefinition[]
): LevelCompilationError[] => {
  const anchors = new Set<string>()
  const terminals = new Set<CellKey>()
  const errors = targets.flatMap((target, index) => (
    validateTarget(topology, graph, target, index, anchors, terminals)
  ))

  return [...errors, ...getUnboundTerminalErrors(graph, terminals)]
}

const getTerminalError = (
  graph: GravityGraph,
  key: CellKey,
  path: readonly (string | number)[],
  index: number,
  duplicate: boolean
): LevelCompilationError[] => graph.nodes.get(key)?.next === null && !duplicate ? [] : [levelError(
  'invalid-edge-target',
  [...path, 'terminals', index],
  `Edge target cell ${key} must be a unique terminal`
)]

const getTargetAnchorErrors = (
  topology: BoardTopology,
  target: GravityEdgeTargetDefinition,
  path: readonly (string | number)[],
  duplicate: boolean
): LevelCompilationError[] => isValidAnchor(target.anchor, topology.bounds) && !duplicate ? [] : [
  levelError('invalid-edge-target', [...path, 'anchor'], 'Edge target anchor must be valid and unique'),
]

const getTargetErrors = (
  topology: BoardTopology,
  graph: GravityGraph,
  target: GravityEdgeTargetDefinition,
  path: readonly (string | number)[],
  anchors: ReadonlySet<string>,
  terminals: ReadonlySet<CellKey>
): LevelCompilationError[] => {
  const errors = getTargetAnchorErrors(topology, target, path, anchors.has(getAnchorKey(target)))

  if (target.terminals.length === 0) {
    errors.push(levelError('invalid-edge-target', [...path, 'terminals'], 'Edge target needs a terminal'))
  }

  target.terminals.forEach((key, index) => {
    errors.push(...getTerminalError(graph, key, path, index, terminals.has(key)))
  })
  return errors
}

export const compileFlowGravity = (
  topology: BoardTopology,
  definition: FlowDefinition,
  spawns: readonly SpawnDefinition[]
): { gravity: GravityGraph; edgeTargets: GravityEdgeTargetDefinition[]; errors: LevelCompilationError[] } => {
  const next = compileNext(topology, definition)
  const compiled = compileGravityGraph(topology, next.nextByCell, spawns)
  const targetErrors = validateEdgeTargets(topology, compiled.gravity, definition.edgeTargets)

  return {
    gravity: compiled.gravity,
    edgeTargets: [...definition.edgeTargets],
    errors: [...next.errors, ...compiled.errors, ...targetErrors],
  }
}
