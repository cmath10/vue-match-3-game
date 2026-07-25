import type { ObjectiveCollection } from '@/entities/Match3ObjectiveCollection'

import { expect, test } from '@playwright/test'

import {
  getCookieBreakEffectStyle,
  useMatch3CookieBreakAnimation,
} from '@/composables/useMatch3CookieBreakAnimation'

import { SPECIAL_TILE_TYPE, TILE_TYPE } from '@/enums/game'

const cookieCollection: ObjectiveCollection = {
  tileId: 42,
  type: SPECIAL_TILE_TYPE.COOKIE,
  position: { row: 2, column: 3 },
}

test('cookie collection animates fragments and clears them after the board transition', async () => {
  let finishAnimation: (() => void) | undefined
  const animation = useMatch3CookieBreakAnimation({
    nextAnimationFrame: () => Promise.resolve(),
    waitAnimation: () => new Promise<void>(resolve => finishAnimation = resolve),
  })

  animation.collect({
    ...cookieCollection,
    type: TILE_TYPE.SWEETS_BARBARIS,
  })
  await animation.animatePending()
  expect(animation.effects.value).toHaveLength(0)

  animation.collect(cookieCollection)
  const running = animation.animatePending()

  await expect.poll(() => animation.effects.value[0]?.active).toBe(true)
  expect(getCookieBreakEffectStyle(animation.effects.value[0]).transform).toContain('3 *')
  finishAnimation?.()
  await running

  expect(animation.effects.value).toHaveLength(0)
})

test('cancelling cookie fragments prevents an obsolete animation from returning', async () => {
  let finishAnimation: (() => void) | undefined
  const animation = useMatch3CookieBreakAnimation({
    nextAnimationFrame: () => Promise.resolve(),
    waitAnimation: () => new Promise<void>(resolve => finishAnimation = resolve),
  })

  animation.collect(cookieCollection)
  const running = animation.animatePending()

  await expect.poll(() => animation.effects.value[0]?.active).toBe(true)
  animation.cancel()
  expect(animation.effects.value).toHaveLength(0)
  finishAnimation?.()
  await running

  expect(animation.effects.value).toHaveLength(0)
})

test('cookie fragments use all five artist assets and scatter when activated', async ({ page }) => {
  await page.goto('/')

  await page.evaluate(() => {
    const effect = document.createElement('div')

    effect.dataset.testCookieBreak = ''
    effect.className = 'b-game-cookie-break'
    for (let fragment = 1; fragment <= 5; fragment++) {
      const element = document.createElement('span')

      element.className = [
        'b-game-cookie-break__fragment',
        `b-game-cookie-break__fragment--${fragment}`,
      ].join(' ')
      effect.append(element)
    }
    document.querySelector('.b-game-ground__tiles')?.append(effect)
  })

  const effect = page.locator('[data-test-cookie-break]')
  const fragments = effect.locator('.b-game-cookie-break__fragment')

  await expect(fragments).toHaveCount(5)
  for (let fragment = 1; fragment <= 5; fragment++) {
    await expect(fragments.nth(fragment - 1)).toHaveCSS(
      'background-image',
      new RegExp(`tile-cookie-fragment-${fragment}\\.png`)
    )
  }

  await effect.evaluate(element => element.classList.add('b-game-cookie-break--active'))
  await expect(fragments.first()).toHaveCSS('opacity', '0')
  await expect(fragments.first()).not.toHaveCSS('transform', 'none')
})
