import type { BoardState } from '@/domain/types'
import type { BoardTopology } from '@/domain/levels/types'

import { getCellKey } from '@/domain/levels/coordinates'

export const createRectangularTopology = (width: number, height: number): BoardTopology => ({
  bounds: { width, height },
  playableCells: new Set(Array.from({ length: height }, (_, row) => (
    Array.from({ length: width }, (_, column) => getCellKey({ row, column }))
  )).flat()),
})

export const createRectangularBoardState = <T>(
  occupancy: BoardState<T>['occupancy']
): BoardState<T> => ({
  topology: createRectangularTopology(occupancy[0]?.length ?? 0, occupancy.length),
  occupancy,
})

export const cloneBoardState = <T>(state: BoardState<T>): BoardState<T> => ({
  topology: state.topology,
  occupancy: state.occupancy.map(row => [...row]),
})
