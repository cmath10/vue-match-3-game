import type {
  BoardTopology,
  GravityDefinition,
  GravityEdgeTargetDefinition,
  GravityGraph,
} from '@/domain/levels/types'
import type { LevelCompilationError } from '@/domain/levels/errors'
import type { SpawnDefinition } from '@/domain/levels/types'

import { compileDirectionalGravity } from '@/domain/levels/compileGravity'
import { compileFlowGravity } from '@/domain/levels/compileFlowGravity'
import { compilePointGravity } from '@/domain/levels/compilePointGravity'
import { getDirectionAnchor } from '@/domain/levels/gravityGeometry'
import { parseCellKey } from '@/domain/levels/coordinates'

export type GravityCompilation = {
  gravity: GravityGraph
  edgeTargets: GravityEdgeTargetDefinition[]
  errors: LevelCompilationError[]
}

const getDirectionalTargets = (
  graph: GravityGraph,
  direction: Extract<GravityDefinition, { kind: 'direction' }>['direction']
): GravityEdgeTargetDefinition[] => [...graph.nodes].flatMap(([key, node]) => (
  node.next === null ? [{ anchor: getDirectionAnchor(direction, parseCellKey(key)), terminals: [key] }] : []
))

const compileDirection = (
  topology: BoardTopology,
  definition: Extract<GravityDefinition, { kind: 'direction' }>,
  spawns: readonly SpawnDefinition[]
): GravityCompilation => {
  const compiled = compileDirectionalGravity(topology, definition.direction, spawns)

  return {
    gravity: compiled.gravity,
    edgeTargets: getDirectionalTargets(compiled.gravity, definition.direction),
    errors: compiled.errors,
  }
}

export const compileGravityDefinition = (
  topology: BoardTopology,
  definition: GravityDefinition,
  spawns: readonly SpawnDefinition[]
): GravityCompilation => {
  if (definition.kind === 'point') {
    return compilePointGravity(topology, definition, spawns)
  }
  if (definition.kind === 'flow') {
    return compileFlowGravity(topology, definition, spawns)
  }

  return compileDirection(topology, definition, spawns)
}
