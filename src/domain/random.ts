export const RANDOM_ALGORITHM_VERSION = 1

const UINT32_RANGE = 0x1_0000_0000
const FALLBACK_STATE = 0x6d2b79f5
const FIRST_SHIFT = 13
const SECOND_SHIFT = 17
const THIRD_SHIFT = 5

export type RandomGeneratorSnapshot = {
  algorithmVersion: typeof RANDOM_ALGORITHM_VERSION
  seed: number
  state: readonly [number]
}

const normalizeSeed = (seed: number): number => {
  const normalized = Number.isFinite(seed) ? seed >>> 0 : FALLBACK_STATE

  return normalized === 0 ? FALLBACK_STATE : normalized
}

export class AttemptRandom {
  private readonly seed: number
  private state: number

  public constructor (seed: number, state = seed) {
    this.seed = normalizeSeed(seed)
    this.state = normalizeSeed(state)
  }

  public next (): number {
    let value = this.state

    value ^= value << FIRST_SHIFT
    value ^= value >>> SECOND_SHIFT
    value ^= value << THIRD_SHIFT
    this.state = value >>> 0

    return this.state / UINT32_RANGE
  }

  public select<T> (items: readonly [T, ...T[]]): T {
    return items[Math.floor(this.next() * items.length)]
  }

  public shuffle<T> (items: readonly T[]): T[] {
    const result = [...items]

    for (let index = result.length - 1; index > 0; index--) {
      const target = Math.floor(this.next() * (index + 1))
      const item = result[index]

      result[index] = result[target]
      result[target] = item
    }

    return result
  }

  public snapshot (): RandomGeneratorSnapshot {
    return {
      algorithmVersion: RANDOM_ALGORITHM_VERSION,
      seed: this.seed,
      state: [this.state],
    }
  }
}

export const createAttemptRandom = (seed = Math.floor(Math.random() * UINT32_RANGE)): AttemptRandom => (
  new AttemptRandom(seed)
)

export const restoreAttemptRandom = (snapshot: RandomGeneratorSnapshot): AttemptRandom => {
  if (snapshot.algorithmVersion !== RANDOM_ALGORITHM_VERSION || snapshot.state.length !== 1) {
    throw new Error(`Unsupported random algorithm version: ${snapshot.algorithmVersion}`)
  }

  return new AttemptRandom(snapshot.seed, snapshot.state[0])
}
