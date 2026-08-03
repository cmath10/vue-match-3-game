import type { Locator } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { isAnimatedObjectiveType } from '@/composables/useObjectiveCollection'

import { SpecialTileType, TileType } from '@/domain/enums'

import {
  BOARD_WIDTH,
  findValidMoveForType,
  getObjectiveTypes,
  getTiles,
  makeMove,
  seedMathRandom,
} from './helpers/game-board'

const getRemainingCount = async (objective: Locator): Promise<number> => {
  const text = await objective.textContent()
  const count = text.match(/\d+/)?.[0]

  if (count === undefined) {
    throw new Error(`Cannot read objective count from "${text}"`)
  }

  return Number(count)
}

test('ordinary objective tiles reach the counter before it changes', async ({ page }) => {
  await seedMathRandom(page)
  await page.goto('/game/1')

  const objectiveType = (await getObjectiveTypes(page))
    .find(type => Object.values(TileType).includes(type as TileType))

  expect(objectiveType).toBeDefined()

  const objective = page.locator(
    `.b-game-menu__objective[data-objective-type="${objectiveType}"]`
  )
  const countBefore = await getRemainingCount(objective)
  const move = findValidMoveForType(await getTiles(page), objectiveType!)

  await makeMove(page, move)

  const flights = page.locator(`.b-game-objective-flight[data-objective-type="${objectiveType}"]`)

  await expect(flights.first()).toBeVisible({ timeout: 3_000 })
  expect(await getRemainingCount(objective)).toBe(countBefore)
  await expect(flights).toHaveCount(0, { timeout: 10_000 })
  expect(await getRemainingCount(objective)).toBeLessThan(countBefore)
})

test('only ordinary tiles and mugs use objective flights', () => {
  Object.values(TileType).forEach(type => expect(isAnimatedObjectiveType(type)).toBe(true))
  expect(isAnimatedObjectiveType(SpecialTileType.Mug)).toBe(true)
  expect(isAnimatedObjectiveType(SpecialTileType.Cookie)).toBe(false)
  expect(isAnimatedObjectiveType(SpecialTileType.Package)).toBe(false)
})

test('mug drops past the board edge before flying to its counter', async ({ page }) => {
  await page.goto('/game/1')

  const result = await page.evaluate(async ({ boardWidth, modulePath, mugType }) => {
    const { useObjectiveCollection } = await import(modulePath)
    const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds))
    const target = document.createElement('div')
    const targetTile = document.createElement('span')
    const counters = [{ type: mugType, count: 0 }]

    target.dataset.objectiveType = mugType
    targetTile.className = 'b-game-menu__objective-tile'
    targetTile.style.cssText = 'position:fixed;left:20px;top:20px;width:40px;height:40px'
    target.append(targetTile)
    document.body.append(target)

    const collection = useObjectiveCollection({
      objectives: [{ type: mugType, count: 1 }],
      counters,
      boardWidth,
      incrementCounter: (type: string) => {
        counters.find(counter => counter.type === type)!.count++
      },
      waitAnimation: () => delay(200),
      nextAnimationFrame: () => new Promise<void>(resolve => requestAnimationFrame(() => resolve())),
    })

    collection.collect({ tileId: 99_999, type: mugType, position: { row: 0, column: 0 } })
    const animation = collection.animatePending()

    await delay(80)
    const dropping = collection.flights.value[0]
    const groundBottom = document.querySelector('.b-game-ground')!.getBoundingClientRect().bottom
    const duringDrop = {
      phase: dropping.phase,
      overflowRatio: (dropping.drop.y + dropping.size - groundBottom) / dropping.size,
      count: counters[0].count,
    }

    await delay(160)
    const duringFlight = {
      phase: collection.flights.value[0].phase,
      count: counters[0].count,
    }

    await animation
    target.remove()

    return {
      duringDrop,
      duringFlight,
      countAfter: counters[0].count,
      flightsAfter: collection.flights.value.length,
    }
  }, {
    boardWidth: BOARD_WIDTH,
    modulePath: '/src/composables/useObjectiveCollection.ts',
    mugType: SpecialTileType.Mug,
  })

  expect(result.duringDrop).toEqual({
    phase: 'dropping',
    overflowRatio: expect.closeTo(0.15),
    count: 0,
  })
  expect(result.duringFlight).toEqual({ phase: 'flying', count: 0 })
  expect(result.countAfter).toBe(1)
  expect(result.flightsAfter).toBe(0)
})
