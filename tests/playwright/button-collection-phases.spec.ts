import type { BoosterWave } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { BoosterType } from '@/domain/enums'
import TileGrid from '@/game/board/TileGrid'
import { TileType } from '@/domain/enums'
import { useButtonCollection } from '@/composables/useButtonCollection'

const createScenario = () => {
  const grid = new TileGrid(3, 1)
  const positions = [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 }]

  positions.forEach((position, id) => grid.setTile({
    ...position, id, selected: false, type: id === 0 ? BoosterType.ButtonBox : TileType.SweetsFish,
  }, position.row, position.column))
  const wave: BoosterWave = {
    effects: [{ source: positions[0], positions, booster: BoosterType.ButtonBox, targetType: TileType.SweetsFish }],
    positions, activatedBoosters: [BoosterType.ButtonBox], combination: null,
  }
  const waits: Array<() => void> = []
  const durations: number[] = []
  const wait = () => new Promise<void>(resolve => waits.push(resolve))
  const collection = useButtonCollection({
    grid, waitDuration: (duration) => { durations.push(duration); return wait() },
    waitAnimation: wait, nextAnimationFrame: () => Promise.resolve(),
  })

  return { collection, waits, wave, durations }
}

test('a button box targets, highlights, transforms and only then collects its tiles', async () => {
  const { collection, waits, wave, durations } = createScenario()
  const animation = collection.animateWave(wave)

  for (const phase of ['targeting', 'highlighted', 'transformed', 'fading', 'flying']) {
    await expect.poll(() => waits.length).toBe(1)
    expect(collection.flights.value.map(flight => flight.phase)).toEqual([phase, phase])
    expect(collection.collectingTileIds.value).toEqual(new Set([1, 2]))
    waits.shift()!()
  }
  await animation
  expect(durations).toEqual([240, 180, 180, 240])
  expect(collection.flights.value).toEqual([])
  expect(collection.collectingTileIds.value.size).toBe(0)
})

for (const phase of ['targeting', 'highlighted', 'transformed', 'fading', 'flying']) {
  test(`cancelling during ${phase} cannot clear a later button animation`, async () => {
    const { collection, waits, wave } = createScenario()
    const oldAnimation = collection.animateWave(wave)

    for (const current of ['targeting', 'highlighted', 'transformed', 'fading', 'flying']) {
      await expect.poll(() => waits.length).toBe(1)
      if (current === phase) {
        break
      }
      waits.shift()!()
    }
    const finishOldPhase = waits.shift()!

    collection.cancel()
    expect(collection.flights.value).toEqual([])
    const newAnimation = collection.animateWave(wave)

    await expect.poll(() => waits.length).toBe(1)
    const newFlights = collection.flights.value

    finishOldPhase()
    await oldAnimation
    expect(collection.flights.value).toBe(newFlights)
    expect(collection.flights.value.every(flight => flight.phase === 'targeting')).toBe(true)
    collection.cancel()
    waits.shift()!()
    await newAnimation
    expect(collection.flights.value).toEqual([])
  })
}
