import type {
  BoardTopology,
  InitialBoardDefinition,
  InitialBoardPlan,
  InitialCellDefinition,
} from '@/domain/levels/types'
import type { LevelCompilationError } from '@/domain/levels/errors'

import { BoosterType } from '@/domain/enums'
import { getCellKey } from '@/domain/levels/coordinates'
import { levelError } from '@/domain/levels/errors'
import { SpecialTileType, TileType } from '@/domain/enums'

type InitialBoardCompilation = {
  topology: BoardTopology
  initialBoard: InitialBoardPlan
  errors: LevelCompilationError[]
}

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0
const isEnumValue = <T extends string>(values: T[], value: T): boolean => values.includes(value)

const getBlocker = (cell: InitialCellDefinition) => {
  if (cell.kind === 'random') {
    return cell.blocker
  }

  return cell.tile.kind === 'ordinary' ? cell.tile.blocker : undefined
}

const validateBlocker = (
  cell: InitialCellDefinition,
  path: readonly (string | number)[]
): LevelCompilationError[] => {
  const blocker = getBlocker(cell)

  return blocker !== undefined && !isPositiveInteger(blocker.health)
    ? [levelError('invalid-fixed-tile', [...path, 'blocker', 'health'], 'Blocker health must be positive')]
    : []
}

const isValidFixedTile = (cell: Extract<InitialCellDefinition, { kind: 'fixed' }>): boolean => {
  const tile = cell.tile

  if (tile.kind === 'ordinary') {
    return isEnumValue(Object.values(TileType), tile.type)
  }
  if (tile.kind === 'booster') {
    return isEnumValue(Object.values(BoosterType), tile.type)
  }

  return isEnumValue([SpecialTileType.Mug, SpecialTileType.Cookie], tile.type)
}

const validateCookieHealth = (
  cell: Extract<InitialCellDefinition, { kind: 'fixed' }>,
  path: readonly (string | number)[]
): LevelCompilationError[] => {
  const tile = cell.tile

  return tile.kind === 'special' && tile.type === SpecialTileType.Cookie && !isPositiveInteger(tile.health)
    ? [levelError('invalid-fixed-tile', [...path, 'tile', 'health'], 'Cookie health must be positive')]
    : []
}

const validateFixedTile = (
  cell: InitialCellDefinition,
  path: readonly (string | number)[]
): LevelCompilationError[] => {
  if (cell.kind !== 'fixed') {
    return []
  }
  if (!isValidFixedTile(cell)) {
    return [levelError('invalid-fixed-tile', [...path, 'tile'], 'Unknown fixed tile')]
  }

  return validateCookieHealth(cell, path)
}

const validateLegend = (definition: InitialBoardDefinition): LevelCompilationError[] => {
  return Object.entries(definition.legend).flatMap(([token, cell]) => {
    const path = ['initialBoard', 'legend', token]
    const tokenErrors = Array.from(token).length !== 1 || token === '.'
      ? [levelError('invalid-layout', path, 'Legend token must be one character other than `.`')]
      : []

    return [...tokenErrors, ...validateFixedTile(cell, path), ...validateBlocker(cell, path)]
  })
}

const getLayoutWidth = (layout: readonly string[]): number => (
  layout.length === 0 ? 0 : Array.from(layout[0]).length
)

const validateLayout = (definition: InitialBoardDefinition): LevelCompilationError[] => {
  const width = getLayoutWidth(definition.layout)

  if (definition.layout.length === 0 || width === 0) {
    return [levelError('invalid-layout', ['initialBoard', 'layout'], 'Layout must not be empty')]
  }

  return definition.layout.flatMap((row, rowIndex) => (
    Array.from(row).length === width
      ? []
      : [levelError('invalid-layout', ['initialBoard', 'layout', rowIndex], 'Layout rows must have equal width')]
  ))
}

const compileToken = (
  definition: InitialBoardDefinition,
  cells: Map<`${number}:${number}`, InitialCellDefinition>,
  errors: LevelCompilationError[],
  token: string,
  row: number,
  column: number
): void => {
  const cell = definition.legend[token]

  if (token !== '.' && cell === undefined) {
    errors.push(levelError(
      'unknown-layout-token',
      ['initialBoard', 'layout', row, column],
      `Unknown layout token: ${token}`
    ))
  } else if (cell !== undefined) {
    cells.set(getCellKey({ row, column }), cell)
  }
}

const compileCells = (
  definition: InitialBoardDefinition,
  errors: LevelCompilationError[]
): Map<`${number}:${number}`, InitialCellDefinition> => {
  const cells = new Map<`${number}:${number}`, InitialCellDefinition>()

  definition.layout.forEach((row, rowIndex) => Array.from(row).forEach((token, columnIndex) => (
    compileToken(definition, cells, errors, token, rowIndex, columnIndex)
  )))

  return cells
}

export const compileInitialBoard = (definition: InitialBoardDefinition): InitialBoardCompilation => {
  const errors = [...validateLayout(definition), ...validateLegend(definition)]
  const cells = compileCells(definition, errors)
  const width = getLayoutWidth(definition.layout)

  if (cells.size === 0) {
    errors.push(levelError('invalid-layout', ['initialBoard', 'layout'], 'Layout must contain a playable cell'))
  }

  return {
    topology: {
      bounds: { width, height: definition.layout.length },
      playableCells: new Set(cells.keys()),
    },
    initialBoard: { cells },
    errors,
  }
}
