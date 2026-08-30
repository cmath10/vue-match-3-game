import type { Position, Tile, TileMovement } from '@/domain/types'

import { reactive } from 'vue'

import { getTileMovementSegments } from '@/presentation/tileMovementSegments'

type MovementAnimationOptions = {
  duration: number
  getSpawnOrigin: (spawnId: string, index: number) => Position
  getTile: (tileId: string) => Tile | undefined
  nextFrame: () => Promise<void>
  wait: (duration: number) => Promise<void>
}

type AnimationState = {
  version: number
}

type AnimationContext = {
  options: MovementAnimationOptions
  durations: Map<number, number>
  state: AnimationState
}

const setPosition = (tile: Tile, position: Position): void => {
  tile.row = position.row
  tile.column = position.column
}

const getSpawnIndexes = (movements: readonly TileMovement[]): Map<TileMovement, number> => {
  const counts = new Map<string, number>()
  const indexes = new Map<TileMovement, number>()

  movements.forEach((movement) => {
    if (movement.origin.kind === 'spawn') {
      const index = counts.get(movement.origin.spawnId) ?? 0

      counts.set(movement.origin.spawnId, index + 1)
      indexes.set(movement, index)
    }
  })
  return indexes
}

const getOrigin = (
  context: AnimationContext,
  movement: TileMovement,
  spawnIndexes: ReadonlyMap<TileMovement, number>
): Position => movement.origin.kind === 'cell'
  ? movement.origin.position
  : context.options.getSpawnOrigin(movement.origin.spawnId, spawnIndexes.get(movement) ?? 0)

const prepareTile = (
  context: AnimationContext,
  movement: TileMovement,
  origin: Position,
  prepared: Set<string>
): void => {
  const tile = context.options.getTile(movement.tileId)

  if (tile !== undefined && !prepared.has(movement.tileId)) {
    context.durations.set(tile.id, 0)
    setPosition(tile, origin)
    prepared.add(movement.tileId)
  }
}

const prepareTiles = (
  context: AnimationContext,
  movements: readonly TileMovement[]
): ReadonlyMap<TileMovement, Position> => {
  const prepared = new Set<string>()
  const spawnIndexes = getSpawnIndexes(movements)
  const origins = new Map<TileMovement, Position>()

  movements.forEach((movement) => {
    const origin = getOrigin(context, movement, spawnIndexes)

    origins.set(movement, origin)
    prepareTile(context, movement, origin, prepared)
  })
  return origins
}

const animatePath = async (
  context: AnimationContext,
  tile: Tile,
  movement: TileMovement,
  origin: Position,
  version: number
): Promise<void> => {
  const stepDuration = context.options.duration / movement.path.length

  for (const segment of getTileMovementSegments(origin, movement.path)) {
    if (context.state.version !== version) {
      return
    }
    const duration = stepDuration * segment.steps

    context.durations.set(tile.id, duration)
    setPosition(tile, segment.position)
    await context.options.wait(duration)
  }
}

const animateMovement = async (
  context: AnimationContext,
  movement: TileMovement,
  origin: Position,
  version: number
): Promise<void> => {
  const tile = context.options.getTile(movement.tileId)

  if (tile === undefined || context.state.version !== version) {
    return
  }
  await animatePath(context, tile, movement, origin, version)
}

const getPhases = (movements: readonly TileMovement[]): TileMovement[][] => {
  const phases = new Map<number, TileMovement[]>()

  movements.forEach((movement) => {
    const phase = phases.get(movement.phase) ?? []

    phase.push(movement)
    phases.set(movement.phase, phase)
  })

  return [...phases].sort(([first], [second]) => first - second).map(([, items]) => items)
}

const getPreparedOrigin = (
  origins: ReadonlyMap<TileMovement, Position>,
  movement: TileMovement
): Position => {
  const origin = origins.get(movement)

  if (origin === undefined) {
    throw new Error(`Missing prepared origin for tile ${movement.tileId}`)
  }
  return origin
}

const animatePhases = async (
  context: AnimationContext,
  movements: readonly TileMovement[],
  origins: ReadonlyMap<TileMovement, Position>,
  version: number
): Promise<void> => {
  for (const phase of getPhases(movements)) {
    if (context.state.version !== version) {
      return
    }
    await Promise.all(phase.map(movement => animateMovement(
      context, movement, getPreparedOrigin(origins, movement), version
    )))
  }
}

const animate = async (
  context: AnimationContext,
  movements: readonly TileMovement[]
): Promise<void> => {
  const version = ++context.state.version
  const origins = prepareTiles(context, movements)

  await context.options.nextFrame()
  await context.options.nextFrame()
  await animatePhases(context, movements, origins, version)
  if (context.state.version === version) {
    context.durations.clear()
  }
}

export const useTileMovementAnimation = (options: MovementAnimationOptions) => {
  const durations = reactive(new Map<number, number>())
  const context = { options, durations, state: { version: 0 } }

  return {
    durations,
    animate: (movements: readonly TileMovement[]) => animate(context, movements),
    cancel: () => {
      context.state.version++
      durations.clear()
    },
  }
}
