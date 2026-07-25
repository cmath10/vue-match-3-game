import type { Counter, Objective } from '@/types/game'

import type { ObjectiveCollection } from '@/entities/Match3ObjectiveCollection'
import type { ObjectiveFlight } from '@/entities/Match3ObjectiveFlightPresentation'
import type { ObjectiveType } from '@/enums/game'

import type { Ref } from 'vue'

import { nextTick, ref } from 'vue'

import { createObjectiveFlight } from '@/entities/Match3ObjectiveFlightPresentation'

import { SPECIAL_TILE_TYPE, TILE_TYPE } from '@/enums/game'

type ObjectiveCollectionOptions = {
  objectives: Objective[]
  counters: Counter[]
  boardWidth: number
  incrementCounter: (type: ObjectiveType) => void
  waitAnimation: () => Promise<void>
  nextAnimationFrame: () => Promise<void>
}

const MUG_DROP_DELAY = 180
const ANIMATED_OBJECTIVE_TYPES = new Set<ObjectiveType>([
  ...Object.values(TILE_TYPE),
  SPECIAL_TILE_TYPE.MUG,
])

export const isAnimatedObjectiveType = (type: ObjectiveType): boolean => (
  ANIMATED_OBJECTIVE_TYPES.has(type)
)

export const useMatch3ObjectiveCollection = (options: ObjectiveCollectionOptions) => {
  const flights = ref<ObjectiveFlight[]>([])
  const pending: ObjectiveCollection[] = []
  const animationVersion = ref(0)

  const cancel = (): void => {
    animationVersion.value++
    pending.splice(0)
    flights.value = []
  }

  return {
    flights,
    collect: (collection: ObjectiveCollection) => collect(options, pending, collection),
    animatePending: () => animatePending(options, flights, pending, animationVersion),
    cancel,
  }
}

const collect = (
  options: ObjectiveCollectionOptions,
  pending: ObjectiveCollection[],
  collection: ObjectiveCollection
): void => {
  if (shouldAnimate(options, collection.type)) {
    pending.push(collection)
  } else {
    options.incrementCounter(collection.type)
  }
}

const shouldAnimate = (options: ObjectiveCollectionOptions, type: ObjectiveType): boolean => {
  const objective = options.objectives.find(item => item.type === type)
  const collected = options.counters.find(item => item.type === type)?.count ?? 0

  return isAnimatedObjectiveType(type) &&
    objective !== undefined &&
    collected < objective.count
}

const animatePending = async (
  options: ObjectiveCollectionOptions,
  flights: Ref<ObjectiveFlight[]>,
  pending: ObjectiveCollection[],
  animationVersion: Ref<number>
): Promise<void> => {
  const collections = pending.splice(0)
  const createdFlights = getFlights(options, collections)
  const version = animationVersion.value

  const activeFlights = setFlights(options, flights, collections, createdFlights)
  if (activeFlights.length === 0) {
    return
  }

  await startFlights(options)
  await Promise.all(activeFlights.map(flight => (
    animateFlight(options, flights, flight, version, animationVersion)
  )))
}

const setFlights = (
  options: ObjectiveCollectionOptions,
  flights: Ref<ObjectiveFlight[]>,
  collections: ObjectiveCollection[],
  createdFlights: ObjectiveFlight[]
): ObjectiveFlight[] => {
  incrementUnrenderedCollections(options, collections, createdFlights)
  flights.value = createdFlights

  return [...flights.value]
}

const startFlights = async (options: ObjectiveCollectionOptions): Promise<void> => {
  await nextTick()
  await options.nextAnimationFrame()
  await options.nextAnimationFrame()
}

const animateFlight = async (
  options: ObjectiveCollectionOptions,
  flights: Ref<ObjectiveFlight[]>,
  flight: ObjectiveFlight,
  version: number,
  animationVersion: Ref<number>
): Promise<void> => {
  if (flight.type === SPECIAL_TILE_TYPE.MUG) {
    flight.phase = 'dropping'
    await waitMugDrop()
  }
  if (version !== animationVersion.value) {
    return
  }

  flight.phase = 'flying'
  await options.waitAnimation()
  arrive(options, flights, flight, version, animationVersion)
}

const arrive = (
  options: ObjectiveCollectionOptions,
  flights: Ref<ObjectiveFlight[]>,
  flight: ObjectiveFlight,
  version: number,
  animationVersion: Ref<number>
): void => {
  if (version === animationVersion.value) {
    options.incrementCounter(flight.type)
    flights.value = flights.value.filter(item => item.id !== flight.id)
  }
}

const getFlights = (
  options: ObjectiveCollectionOptions,
  collections: ObjectiveCollection[]
): ObjectiveFlight[] => {
  return collections.flatMap((collection) => {
    const flight = createObjectiveFlight(options.boardWidth, collection)

    return flight === null ? [] : [flight]
  })
}

const waitMugDrop = () => new Promise<void>(resolve => setTimeout(resolve, MUG_DROP_DELAY))

const incrementUnrenderedCollections = (
  options: ObjectiveCollectionOptions,
  collections: ObjectiveCollection[],
  flights: ObjectiveFlight[]
): void => {
  const renderedIds = new Set(flights.map(flight => flight.id))

  collections
    .filter(collection => !renderedIds.has(`${collection.type}-${collection.tileId}`))
    .forEach(collection => options.incrementCounter(collection.type))
}
