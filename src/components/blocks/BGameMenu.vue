<template>
    <div class="b-game-menu d-flex flex-column flex-grow-1">
        <h1 class="h2 mb-0">
            Game
        </h1>

        <div class="d-flex flex-column gap-4 mt-4">
            <div
                v-for="(objective, index) in objectivesComputed"
                :key="index"
                class="b-game-menu__objective d-flex align-items-center gap-3"
            >
                <b-game-tile :type="objective.type" :small="true" />
                <span>&times; {{ objective.count }}</span>
            </div>
        </div>

        <div class="b-game-menu__turns mt-auto pt-4">
            <div class="b-game-menu__turns-label">
                Turns
            </div>

            <div class="b-game-menu__turns-value">
                {{ turns }}
            </div>

            <button
                class="btn btn-outline-light mt-3"
                type="button"
                @click="emit('new-game')"
            >
                New game
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type { Counter, Objective } from '@/types/game'

import { computed } from 'vue'

import BGameTile from '@/components/blocks/BGameTile.vue'

const props = defineProps<{
  objectives: Objective[]
  counters: Counter[]
  turns: number
}>()
const emit = defineEmits<{
  'new-game': []
}>()

defineOptions({ name: 'BGameMenu' })

const countersByType = computed(() => {
  const countersByType = new Map<Counter['type'], number>()

  props.counters.forEach((counter: Counter) => {
    countersByType.set(counter.type, counter.count)
  })

  return countersByType
})

const objectivesComputed = computed(() => {
  return props.objectives.map((objective: Objective) => {
    const collected = countersByType.value.get(objective.type) || 0

    return {
      type: objective.type,
      count: objective.count - collected,
    }
  })
})
</script>

<style lang="scss">
@import "../../assets/scss/blocks/b-game-menu";
</style>
