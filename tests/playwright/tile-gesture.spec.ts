import { expect, test } from '@playwright/test'

import { getDirectionalNeighbor, getSwipeDirection } from '@/entities/TileGesture'

test('swipe direction uses the dominant axis after crossing its threshold', () => {
  expect(getSwipeDirection({ x: 10, y: 10 }, { x: 24, y: 14 }, 8)).toBe('right')
  expect(getSwipeDirection({ x: 10, y: 10 }, { x: -4, y: 6 }, 8)).toBe('left')
  expect(getSwipeDirection({ x: 10, y: 10 }, { x: 14, y: 24 }, 8)).toBe('down')
  expect(getSwipeDirection({ x: 10, y: 10 }, { x: 6, y: -4 }, 8)).toBe('up')
})

test('movement within the drag threshold does not become a swipe', () => {
  expect(getSwipeDirection({ x: 10, y: 10 }, { x: 16, y: 14 }, 8)).toBeNull()
})

test('swipe direction resolves the corresponding neighboring cell', () => {
  const source = { row: 3, column: 4 }

  expect(getDirectionalNeighbor(source, 'up')).toEqual({ row: 2, column: 4 })
  expect(getDirectionalNeighbor(source, 'right')).toEqual({ row: 3, column: 5 })
  expect(getDirectionalNeighbor(source, 'down')).toEqual({ row: 4, column: 4 })
  expect(getDirectionalNeighbor(source, 'left')).toEqual({ row: 3, column: 3 })
})
