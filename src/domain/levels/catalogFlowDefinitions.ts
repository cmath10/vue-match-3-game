import type {
  BoardEdgeAnchor,
  CellKey,
  Direction,
  GravityDefinition,
} from '@/domain/levels/types'
import type { Position } from '@/domain/types'

import { getCellKey } from '@/domain/levels/coordinates'

type FlowDefinition = Extract<GravityDefinition, { kind: 'flow' }>

const getCells = (layout: readonly string[]): Position[] => layout.flatMap((line, row) => (
  Array.from(line).flatMap((token, column) => token === '.' ? [] : [{ row, column }])
))

const getDirectionDelta = (direction: Direction): Position => ({
  down: { row: 1, column: 0 },
  left: { row: 0, column: -1 },
  right: { row: 0, column: 1 },
  up: { row: -1, column: 0 },
})[direction]

const move = (position: Position, delta: Position): Position => ({
  row: position.row + delta.row,
  column: position.column + delta.column,
})

const getAnchor = (direction: Direction, position: Position): BoardEdgeAnchor => (
  direction === 'down' || direction === 'up'
    ? { side: direction === 'down' ? 'bottom' : 'top', column: position.column }
    : { side: direction === 'left' ? 'left' : 'right', row: position.row }
)

export const createDirectionalFlow = (
  layout: readonly string[],
  direction: Direction
): FlowDefinition => {
  const cells = getCells(layout)
  const keys = new Set(cells.map(getCellKey))
  const delta = getDirectionDelta(direction)
  const nextByCell = Object.fromEntries(cells.map((cell): [CellKey, CellKey | null] => {
    const next = getCellKey(move(cell, delta))

    return [getCellKey(cell), keys.has(next) ? next : null]
  }))
  const terminals = cells.filter(cell => nextByCell[getCellKey(cell)] === null)

  return {
    kind: 'flow',
    nextByCell,
    edgeTargets: terminals.map(cell => ({ anchor: getAnchor(direction, cell), terminals: [getCellKey(cell)] })),
  }
}

const createPathsFlow = (
  paths: readonly Position[][],
  anchors: readonly BoardEdgeAnchor[]
): FlowDefinition => ({
  kind: 'flow',
  nextByCell: Object.fromEntries(paths.flatMap(path => path.map((cell, index) => [
    getCellKey(cell), path[index + 1] === undefined ? null : getCellKey(path[index + 1]),
  ]))),
  edgeTargets: paths.map((path, index) => ({
    anchor: anchors[index],
    terminals: [getCellKey(path[path.length - 1])],
  })),
})

export const createOutwardRowFlow = (
  width: number,
  height: number,
  splitColumn: number
): FlowDefinition => {
  const paths = Array.from({ length: height }, (_, row) => {
    const columns = Array.from({ length: width }, (__, column) => column)

    return [columns.slice(0, splitColumn).reverse(), columns.slice(splitColumn)]
      .map(part => part.map(column => ({ row, column })))
  }).flat()
  const anchors = paths.map((path): BoardEdgeAnchor => ({
    side: path.at(-1)!.column === 0 ? 'left' : 'right',
    row: path.at(-1)!.row,
  }))

  return createPathsFlow(paths, anchors)
}

export const createOutwardColumnFlow = (
  width: number,
  height: number,
  splitRow: number
): FlowDefinition => {
  const paths = Array.from({ length: width }, (_, column) => {
    const rows = Array.from({ length: height }, (__, row) => row)

    return [rows.slice(0, splitRow).reverse(), rows.slice(splitRow)]
      .map(part => part.map(row => ({ row, column })))
  }).flat()
  const anchors = paths.map((path): BoardEdgeAnchor => ({
    side: path.at(-1)!.row === 0 ? 'top' : 'bottom',
    column: path.at(-1)!.column,
  }))

  return createPathsFlow(paths, anchors)
}
