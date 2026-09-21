import type { BoardSurface } from '@/presentation/boardSurface'
import type { CompiledLevel, FixedTileDefinition } from '@/domain/levels/types'
import type { SpecialTileType, TileVisualType } from '@/domain/enums'

import { AttemptRandom } from '@/domain/random'
import { getBoardSurface } from '@/presentation/boardSurface'
import { getCellKey } from '@/domain/levels/coordinates'
import { materializeInitialBoard } from '@/domain/levels/materializeInitialBoard'

export type LevelPreviewTile = {
  key: string
  blocker?: SpecialTileType.Package
  health?: number
  style: {
    gridColumn: number
    gridRow: number
  }
  type: TileVisualType
}

export type LevelPreview = {
  height: number
  surface: BoardSurface
  tiles: readonly LevelPreviewTile[]
  width: number
}

const createPreviewTile = (
  tile: FixedTileDefinition,
  row: number,
  column: number
): LevelPreviewTile => ({
  key: getCellKey({ row, column }),
  type: tile.type,
  blocker: tile.kind === 'ordinary' ? tile.blocker?.type : undefined,
  health: tile.kind === 'special' && 'health' in tile ? tile.health : undefined,
  style: { gridColumn: column + 1, gridRow: row + 1 },
})

export const createLevelPreview = (level: CompiledLevel): LevelPreview => ({
  ...level.topology.bounds,
  surface: getBoardSurface(level.topology),
  tiles: materializeInitialBoard(level, new AttemptRandom(level.id)).flatMap((row, rowIndex) => (
    row.flatMap((tile, column) => tile === null ? [] : [createPreviewTile(tile, rowIndex, column)])
  )),
})
