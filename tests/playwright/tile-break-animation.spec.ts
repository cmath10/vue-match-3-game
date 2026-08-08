import type { ObjectiveCollection } from '@/domain/types'

import { expect, test } from '@playwright/test'

import {
  getTileBreakEffectStyle,
  useTileBreakAnimation,
} from '@/composables/useTileBreakAnimation'

import { SpecialTileType, TileType } from '@/domain/enums'

import {
  findValidMove,
  getTiles,
  makeMove,
  seedMathRandom,
} from './helpers/game-board'

const ordinaryCollection: ObjectiveCollection = {
  tileId: 42,
  type: TileType.SweetsBarbaris,
  position: { row: 2, column: 3 },
}

test('ordinary tile collection animates and clears the effect after the board transition', async () => {
  let finishAnimation: (() => void) | undefined
  const animation = useTileBreakAnimation({
    nextAnimationFrame: () => Promise.resolve(),
    waitAnimation: () => new Promise<void>(resolve => finishAnimation = resolve),
  })

  animation.collect({
    ...ordinaryCollection,
    type: SpecialTileType.Cookie,
  })
  await animation.animatePending()
  expect(animation.effects.value).toHaveLength(0)

  animation.collect(ordinaryCollection)
  const running = animation.animatePending()

  await expect.poll(() => animation.effects.value[0]?.active).toBe(true)
  expect(animation.effects.value[0].type).toBe(TileType.SweetsBarbaris)
  expect(getTileBreakEffectStyle(animation.effects.value[0]).transform).toContain('3 *')
  finishAnimation?.()
  await running

  expect(animation.effects.value).toHaveLength(0)
})

test('cancelling ordinary tile fragments prevents an obsolete animation from returning', async () => {
  let finishAnimation: (() => void) | undefined
  const animation = useTileBreakAnimation({
    nextAnimationFrame: () => Promise.resolve(),
    waitAnimation: () => new Promise<void>(resolve => finishAnimation = resolve),
  })

  animation.collect(ordinaryCollection)
  const running = animation.animatePending()

  await expect.poll(() => animation.effects.value[0]?.active).toBe(true)
  animation.cancel()
  expect(animation.effects.value).toHaveLength(0)
  finishAnimation?.()
  await running

  expect(animation.effects.value).toHaveLength(0)
})

test('every ordinary tile type uses all five artist fragments', async ({ page }) => {
  await page.goto('/game/1')

  const tileTypes = Object.values(TileType)
  await page.evaluate((types) => {
    types.forEach((type) => {
      const effect = document.createElement('div')

      effect.dataset.testTileBreak = type
      effect.className = `b-game-tile-break b-game-tile-break--${type}`
      for (let fragment = 1; fragment <= 5; fragment++) {
        const element = document.createElement('span')

        element.className = [
          'b-game-tile-break__fragment',
          `b-game-tile-break__fragment--${fragment}`,
        ].join(' ')
        effect.append(element)
      }
      document.querySelector('.b-game-ground__tiles')?.append(effect)
    })
  }, tileTypes)

  for (const type of tileTypes) {
    const fragments = page.locator(`[data-test-tile-break="${type}"] .b-game-tile-break__fragment`)

    await expect(fragments).toHaveCount(5)
    for (let fragment = 1; fragment <= 5; fragment++) {
      await expect(fragments.nth(fragment - 1)).toHaveCSS(
        'background-image',
        new RegExp(`tile-${type}-fragment-${fragment}\\.png`)
      )
    }
  }
})

test('a real match shrinks ordinary tiles and bursts their fragments', async ({ page }, testInfo) => {
  await seedMathRandom(page)
  await page.goto('/game/1')

  const move = findValidMove(await getTiles(page))

  await makeMove(page, move)

  const effect = page.locator('.b-game-tile-break[data-tile-break-active="true"]').first()
  const fragments = effect.locator('.b-game-tile-break__fragment')

  await expect(effect).toBeVisible({ timeout: 3_000 })
  await expect(fragments).toHaveCount(5)
  await expect(effect.locator('.b-game-tile-break__tile')).toHaveCSS('opacity', '0')
  const fragmentFrame = await fragments.evaluateAll(async (elements) => {
    elements.forEach((element) => element.getAnimations().forEach((animation) => {
      animation.pause()
      animation.currentTime = 220
    }))
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

    return elements.map((element) => ({
      opacity: Number.parseFloat(getComputedStyle(element).opacity),
      transform: getComputedStyle(element).transform,
    }))
  })

  expect(fragmentFrame.every(fragment => fragment.opacity > 0)).toBe(true)
  expect(new Set(fragmentFrame.map(fragment => fragment.transform)).size).toBe(5)

  await testInfo.attach('ordinary-tile-break', {
    body: await page.locator('.b-game-ground').screenshot(),
    contentType: 'image/png',
  })

  await expect(page.locator('.b-game-tile-break')).toHaveCount(0, { timeout: 10_000 })
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24')
})
