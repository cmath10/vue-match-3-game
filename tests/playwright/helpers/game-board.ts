import type { Page } from '@playwright/test'

import type { Board } from '@/domain/types'

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/domain/config'
import { getMoveMatch } from '@/domain/boosters/creation'

import { BoosterType, TileType } from '@/domain/enums'

export type TileSnapshot = {
  id: string
  type: string
  blocked: boolean
  row: number
  column: number
  x: number
  y: number
  width: number
  height: number
}

export type Move = {
  from: TileSnapshot
  to: TileSnapshot
}

export { BOARD_HEIGHT, BOARD_WIDTH }

const MATCHABLE_TILE_TYPES = new Set<string>(Object.values(TileType))

export const seedMathRandom = async (page: Page, initialSeed = 42) => {
  await page.addInitScript((seedValue) => {
    let seed = seedValue

    Math.random = () => {
      seed = (seed * 16807) % 2147483647

      return (seed - 1) / 2147483646
    }
  }, initialSeed)
}

export const getTiles = async (page: Page): Promise<TileSnapshot[]> => {
  return page.evaluate((boardWidth) => {
    const cells = [...document.querySelectorAll<HTMLElement>('.b-game-ground__cell')]
      .map((element, index) => {
        const rect = element.getBoundingClientRect()

        return {
          row: Math.floor(index / boardWidth),
          column: index % boardWidth,
          centerX: rect.x + rect.width / 2,
          centerY: rect.y + rect.height / 2,
        }
      })

    const getNearestCell = (tileRect: DOMRect) => {
      const tileCenterX = tileRect.x + tileRect.width / 2
      const tileCenterY = tileRect.y + tileRect.height / 2

      return cells.reduce((nearest, cell) => {
        const nearestDistance = Math.hypot(nearest.centerX - tileCenterX, nearest.centerY - tileCenterY)
        const cellDistance = Math.hypot(cell.centerX - tileCenterX, cell.centerY - tileCenterY)

        return cellDistance < nearestDistance ? cell : nearest
      })
    }

    return [...document.querySelectorAll<HTMLElement>('.b-game-ground__tile')].map((element) => {
      const rect = element.getBoundingClientRect()
      const cell = getNearestCell(rect)
      const className = element.className.toString()
      const classNames = className.split(/\s+/)
      const type = classNames
        .find((name: string) => name.startsWith('b-game-tile--') && name !== 'b-game-tile--small')
        ?.replace('b-game-tile--', '') || ''

      return {
        id: element.getAttribute('data-tile-id') || '',
        type,
        blocked: classNames.some((name: string) => name.startsWith('b-game-tile--blocker-')),
        row: cell.row,
        column: cell.column,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }
    })
  }, BOARD_WIDTH)
}

export const getBoard = (tiles: TileSnapshot[]): Board<string> => {
  const board: Board<string> = Array.from(
    { length: BOARD_HEIGHT },
    () => Array.from({ length: BOARD_WIDTH }, (): null => null)
  )

  tiles.forEach(tile => {
    board[tile.row][tile.column] = MATCHABLE_TILE_TYPES.has(tile.type) ? tile.type : null
  })

  return board
}

const getMoveCandidates = (tiles: TileSnapshot[]): Move[] => {
  const byPosition = new Map(tiles.map(tile => [`${tile.row}-${tile.column}`, tile]))

  return tiles.flatMap((tile) => {
    return [
      byPosition.get(`${tile.row}-${tile.column + 1}`),
      byPosition.get(`${tile.row + 1}-${tile.column}`),
    ]
      .filter((candidate): candidate is TileSnapshot => Boolean(candidate))
      .filter(candidate => !tile.blocked && !candidate.blocked)
      .map(candidate => ({ from: tile, to: candidate }))
  })
}

const getMoveResult = (board: Board<string>, move: Move) => {
  const swappedBoard = getSwappedBoard(board, move)
  const from = { row: move.from.row, column: move.from.column }
  const to = { row: move.to.row, column: move.to.column }

  return getMoveMatch(swappedBoard, to, from)
}

const getSwappedBoard = (board: Board<string>, move: Move): Board<string> => {
  const swappedBoard = board.map(row => [...row])
  const from = move.from
  const to = move.to
  const type = swappedBoard[from.row][from.column]

  swappedBoard[from.row][from.column] = swappedBoard[to.row][to.column]
  swappedBoard[to.row][to.column] = type

  return swappedBoard
}

export const findValidMove = (tiles: TileSnapshot[]): Move => {
  const board = getBoard(tiles)
  const move = getMoveCandidates(tiles).find(candidate => getMoveResult(board, candidate).positions.length > 0)

  if (move === undefined) {
    throw new Error('Cannot find a valid move on the seeded board')
  }

  return move
}

export const findValidMoveForType = (tiles: TileSnapshot[], type: string): Move => {
  const board = getBoard(tiles)
  const move = getMoveCandidates(tiles).find((candidate) => {
    const swappedBoard = getSwappedBoard(board, candidate)

    return getMoveResult(board, candidate).positions.some(position => (
      swappedBoard[position.row][position.column] === type
    ))
  })

  if (move === undefined) {
    throw new Error(`Cannot find a valid move for ${type} on the seeded board`)
  }

  return move
}

export const findVerticalValidMove = (tiles: TileSnapshot[]): Move => {
  const board = getBoard(tiles)
  const move = getMoveCandidates(tiles).find(candidate => (
    candidate.from.column === candidate.to.column &&
    getMoveResult(board, candidate).positions.length > 0
  ))

  if (move === undefined) {
    throw new Error('Cannot find a vertical valid move on the seeded board')
  }

  return move
}

export const findBoosterMove = (tiles: TileSnapshot[], type: BoosterType): Move | null => {
  const board = getBoard(tiles)

  return getMoveCandidates(tiles).find(candidate => (
    getMoveResult(board, candidate).boosters.some(booster => booster.type === type)
  )) ?? null
}

export const clickTile = async (page: Page, tile: TileSnapshot) => {
  await page.locator(`.b-game-ground__tile[data-tile-id="${tile.id}"]`).click()
}

export const swipeTile = async (page: Page, from: TileSnapshot, to: TileSnapshot) => {
  const source = page.locator(`.b-game-ground__tile[data-tile-id="${from.id}"]`)
  const target = page.locator(`.b-game-ground__tile[data-tile-id="${to.id}"]`)
  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()

  if (sourceBox === null || targetBox === null) {
    throw new Error('Cannot swipe an invisible tile')
  }

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2)
  await page.mouse.up()
}

export const dragTileToward = async (
  page: Page,
  source: TileSnapshot,
  target: TileSnapshot
): Promise<void> => {
  const sourceX = source.x + source.width / 2
  const sourceY = source.y + source.height / 2
  const targetX = target.x + target.width / 2
  const targetY = target.y + target.height / 2
  const dragRatio = 0.3

  await page.mouse.move(sourceX, sourceY)
  await page.mouse.down()
  await page.mouse.move(
    sourceX + (targetX - sourceX) * dragRatio,
    sourceY + (targetY - sourceY) * dragRatio
  )
  await page.mouse.up()
}

export const makeMove = async (page: Page, move: Move) => {
  await clickTile(page, move.from)
  await clickTile(page, move.to)
}

export const getObjectiveTypes = async (page: Page): Promise<string[]> => {
  return page.locator('.b-game-menu__objective .b-game-tile').evaluateAll((elements) => {
    return elements.map((element) => {
      return element.className.toString()
        .split(/\s+/)
        .find((name: string) => name.startsWith('b-game-tile--') && name !== 'b-game-tile--small')
        ?.replace('b-game-tile--', '') || ''
    })
  })
}
