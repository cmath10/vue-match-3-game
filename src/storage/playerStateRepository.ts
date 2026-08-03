import type { PlayerState } from '@/domain/progress'

export const PLAYER_DATABASE_NAME = 'vue-match-3-game'
export const PLAYER_STATE_STORE = 'player-state'
export const PLAYER_STATE_KEY = 'current'

const DATABASE_VERSION = 1

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(PLAYER_DATABASE_NAME, DATABASE_VERSION)

  request.onerror = () => reject(request.error)
  request.onsuccess = () => resolve(request.result)
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(PLAYER_STATE_STORE)) {
      request.result.createObjectStore(PLAYER_STATE_STORE)
    }
  }
})

const requestResult = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onerror = () => reject(request.error)
  request.onsuccess = () => resolve(request.result)
})

const transactionCompleted = (transaction: IDBTransaction): Promise<void> => (
  new Promise((resolve, reject) => {
    transaction.onabort = () => reject(transaction.error)
    transaction.onerror = () => reject(transaction.error)
    transaction.oncomplete = () => resolve()
  })
)

export const loadPlayerState = async (): Promise<unknown | null> => {
  const database = await openDatabase()
  const transaction = database.transaction(PLAYER_STATE_STORE, 'readonly')
  const request = transaction.objectStore(PLAYER_STATE_STORE).get(PLAYER_STATE_KEY)

  try {
    return await requestResult<unknown | undefined>(request) ?? null
  } finally {
    database.close()
  }
}

export const savePlayerState = async (state: PlayerState): Promise<void> => {
  const database = await openDatabase()
  const transaction = database.transaction(PLAYER_STATE_STORE, 'readwrite')

  transaction.objectStore(PLAYER_STATE_STORE).put(state, PLAYER_STATE_KEY)

  try {
    await transactionCompleted(transaction)
  } finally {
    database.close()
  }
}
