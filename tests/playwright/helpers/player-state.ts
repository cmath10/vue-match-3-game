import type { Page } from '@playwright/test'

import type { PlayerState } from '@/domain/progress'

import {
  PLAYER_DATABASE_NAME,
  PLAYER_STATE_KEY,
  PLAYER_STATE_STORE,
} from '@/storage/playerStateRepository'

type DatabaseCoordinates = {
  databaseName: string
  storeName: string
  key: string
}

const databaseCoordinates: DatabaseCoordinates = {
  databaseName: PLAYER_DATABASE_NAME,
  storeName: PLAYER_STATE_STORE,
  key: PLAYER_STATE_KEY,
}

const writeState = async (page: Page, state: PlayerState): Promise<void> => {
  await page.evaluate(async ({ coordinates, playerState }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(coordinates.databaseName, 1)

      request.onerror = () => reject(request.error)
      request.onupgradeneeded = () => request.result.createObjectStore(coordinates.storeName)
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction(coordinates.storeName, 'readwrite')

        transaction.objectStore(coordinates.storeName).put(playerState, coordinates.key)
        transaction.onerror = () => reject(transaction.error)
        transaction.oncomplete = () => {
          database.close()
          resolve()
        }
      }
    })
  }, { coordinates: databaseCoordinates, playerState: state })
}

export const seedPlayerState = async (page: Page, state: PlayerState): Promise<void> => {
  await page.goto('/')
  await writeState(page, state)
  await page.reload()
}

export const getStoredTurns = async (page: Page, levelId: number): Promise<number | null> => {
  return page.evaluate(async ({ coordinates, id }) => {
    return new Promise<number | null>((resolve, reject) => {
      const request = indexedDB.open(coordinates.databaseName, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const getRequest = database.transaction(coordinates.storeName, 'readonly')
          .objectStore(coordinates.storeName)
          .get(coordinates.key)

        getRequest.onerror = () => reject(getRequest.error)
        getRequest.onsuccess = () => {
          const state = getRequest.result as PlayerState | undefined

          database.close()
          resolve(state?.levels[id]?.attempt?.turns ?? null)
        }
      }
    })
  }, { coordinates: databaseCoordinates, id: levelId })
}
