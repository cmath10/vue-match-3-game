import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

type TileSnapshot = {
  id: string
  type: string
  row: number
  column: number
  x: number
  y: number
  width: number
  height: number
}

type Move = {
  from: TileSnapshot
  to: TileSnapshot
}

const BOARD_WIDTH = 9
const BOARD_HEIGHT = 7
const seedMathRandom = async (page: Page) => {
  await page.addInitScript(() => {
    let seed = 42

    Math.random = () => {
      seed = (seed * 16807) % 2147483647

      return (seed - 1) / 2147483646
    }
  })
}

const getTiles = async (page: Page): Promise<TileSnapshot[]> => {
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
      const type = className
        .split(/\s+/)
        .find((name: string) => name.startsWith('b-game-tile--') && name !== 'b-game-tile--small')
        ?.replace('b-game-tile--', '') || ''

      return {
        id: element.getAttribute('data-tile-id') || '',
        type,
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

const getBoard = (tiles: TileSnapshot[]): string[][] => {
  const board = Array.from({ length: BOARD_HEIGHT }, () => Array.from({ length: BOARD_WIDTH }, () => ''))

  tiles.forEach(tile => {
    board[tile.row][tile.column] = tile.type
  })

  return board
}

const hasMatchAt = (board: string[][], row: number, column: number): boolean => {
  const type = board[row][column]

  if (!type) {
    return false
  }

  let horizontal = 1
  let vertical = 1

  for (let j = column - 1; j >= 0 && board[row][j] === type; j--) {
    horizontal++
  }
  for (let j = column + 1; j < BOARD_WIDTH && board[row][j] === type; j++) {
    horizontal++
  }
  for (let i = row - 1; i >= 0 && board[i][column] === type; i--) {
    vertical++
  }
  for (let i = row + 1; i < BOARD_HEIGHT && board[i][column] === type; i++) {
    vertical++
  }

  return horizontal >= 3 || vertical >= 3
}

const findValidMove = (tiles: TileSnapshot[]): Move => {
  const board = getBoard(tiles)
  const byPosition = new Map(tiles.map(tile => [`${tile.row}-${tile.column}`, tile]))

  for (const tile of tiles) {
    const candidates = [
      byPosition.get(`${tile.row}-${tile.column + 1}`),
      byPosition.get(`${tile.row + 1}-${tile.column}`),
    ].filter((candidate): candidate is TileSnapshot => Boolean(candidate))

    for (const candidate of candidates) {
      board[tile.row][tile.column] = candidate.type
      board[candidate.row][candidate.column] = tile.type

      const isValid = hasMatchAt(board, tile.row, tile.column) ||
        hasMatchAt(board, candidate.row, candidate.column)

      board[tile.row][tile.column] = tile.type
      board[candidate.row][candidate.column] = candidate.type

      if (isValid) {
        return { from: tile, to: candidate }
      }
    }
  }

  throw new Error('Cannot find a valid move on the seeded board')
}

const clickTile = async (page: Page, tile: TileSnapshot) => {
  const tileElement = page.locator(`.b-game-ground__tile[data-tile-id="${tile.id}"]`)

  await tileElement.click()
}

const expectTilesInsideGround = async (page: Page) => {
  const ground = await page.locator('.b-game-ground').boundingBox()
  const tiles = await page.locator('.b-game-ground__tile').all()

  expect(ground).not.toBeNull()

  for (const tile of tiles) {
    const box = await tile.boundingBox()

    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(ground!.x)
    expect(box!.y).toBeGreaterThanOrEqual(ground!.y)
    expect(box!.x + box!.width).toBeLessThanOrEqual(ground!.x + ground!.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(ground!.y + ground!.height)
  }
}

const makeValidMove = async (page: Page): Promise<Move> => {
  const move = findValidMove(await getTiles(page))

  await clickTile(page, move.from)
  await clickTile(page, move.to)

  return move
}

const waitForNewTiles = async (page: Page, existingIds: Set<string>) => {
  await page.waitForFunction((ids) => {
    return [...document.querySelectorAll('.b-game-ground__tile')]
      .some(element => !ids.includes(element.getAttribute('data-tile-id') || ''))
  }, [...existingIds])
}

const expectSwapAnimationStarted = async (page: Page, move: Move) => {
  const tiles = await getTiles(page)
  const movedTile = tiles.find(tile => tile.id === move.from.id)

  expect(movedTile).toBeDefined()

  const startDistance = Math.hypot(move.from.x - move.to.x, move.from.y - move.to.y)
  const currentDistance = Math.hypot(movedTile!.x - move.to.x, movedTile!.y - move.to.y)

  expect(currentDistance).toBeLessThan(startDistance)
}

test('valid moves keep animated tiles inside the board', async ({ page }, testInfo) => {
  await seedMathRandom(page)
  await page.goto('/')
  await expect(page.locator('.b-game-ground')).toBeVisible()
  await testInfo.attach('initial-board', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  const initialTileIds = new Set((await getTiles(page)).map(tile => tile.id))

  const firstMove = await makeValidMove(page)
  await page.waitForTimeout(80)
  await expectSwapAnimationStarted(page, firstMove)
  await testInfo.attach('during-swap', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await waitForNewTiles(page, initialTileIds)

  const ground = await page.locator('.b-game-ground').boundingBox()
  const enteringTiles = (await getTiles(page)).filter(tile => !initialTileIds.has(tile.id))

  expect(ground).not.toBeNull()
  expect(enteringTiles.length).toBeGreaterThan(0)
  expect(enteringTiles.some(tile => tile.y < ground!.y)).toBe(true)

  await page.waitForTimeout(80)
  await testInfo.attach('during-valid-move', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.waitForTimeout(720)
  await testInfo.attach('after-first-valid-move', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await expectTilesInsideGround(page)
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)

  await makeValidMove(page)
  await page.waitForTimeout(800)
  await expectTilesInsideGround(page)
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)
})
