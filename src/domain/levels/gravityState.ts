import type { CellKey, GravityGraph, GravityState } from '@/domain/levels/types'
import type { GravityStateSnapshot } from '@/domain/progress'

const MIN_MERGE_BRANCHES = 2

export const createGravityState = (): GravityState => ({
  nextIncomingIndexByCell: new Map(),
})

export const snapshotGravityState = (state: GravityState): GravityStateSnapshot => ({
  nextIncomingIndexByCell: Object.fromEntries(state.nextIncomingIndexByCell),
})

const isValidCursor = (index: number, incomingCount: number): boolean => (
  Number.isInteger(index) && index >= 0 && incomingCount >= MIN_MERGE_BRANCHES && index < incomingCount
)

export const restoreGravityState = (
  snapshot: GravityStateSnapshot,
  graph: GravityGraph
): GravityState => {
  const entries = Object.entries(snapshot.nextIncomingIndexByCell) as Array<[CellKey, number]>
  const state = createGravityState()

  entries.forEach(([key, index]) => {
    const incomingCount = graph.nodes.get(key)?.incoming.length ?? 0

    if (!isValidCursor(index, incomingCount)) {
      throw new Error(`Invalid gravity cursor at ${key}: ${index}`)
    }
    state.nextIncomingIndexByCell.set(key, index)
  })
  return state
}
