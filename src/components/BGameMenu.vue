<template>
    <div class="b-game-menu">
        <h1 class="b-game-menu__title">
            <span class="b-game-menu__name">{{ t('app.title') }}</span>
            <BGameMascot :sad="result === 'lose'" class="b-game-menu__mascot" />
            <small>{{ t('menu.level', { level: levelId }) }}</small>
        </h1>

        <BLocaleSwitcher class="b-game-menu__language" />

        <div class="b-game-menu__objectives">
            <div
                v-for="(objective, index) in objectivesComputed"
                :key="index"
                :class="{
                    'b-game-menu__objective': true,
                    'b-game-menu__objective--completed': objective.completed,
                }"
                :data-objective-type="objective.type"
            >
                <span class="b-game-menu__objective-tile">
                    <BGameTile :type="objective.type" :small="true" />
                </span>

                <span v-if="!objective.completed">&times; {{ objective.count }}</span>
            </div>
        </div>

        <div class="b-game-menu__turns">
            <div class="b-game-menu__turns-label">
                {{ t('menu.turns') }}
            </div>

            <div class="b-game-menu__turns-value">
                {{ turns }}
            </div>
        </div>

        <div class="b-game-menu__actions">
            <button
                class="b-game-menu__button btn btn-outline-light"
                type="button"
                @click="emit('new-game')"
            >
                {{ t('menu.newGame') }}
            </button>

            <button
                class="b-game-menu__button btn btn-outline-light"
                type="button"
                @click="emit('main-menu')"
            >
                {{ t('menu.mainMenu') }}
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type { Counter, GameResult, Objective } from '@/domain/types'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import BGameMascot from '@/components/BGameMascot.vue'
import BGameTile from '@/components/BGameTile.vue'
import BLocaleSwitcher from '@/components/BLocaleSwitcher.vue'

const props = defineProps<{
  objectives: Objective[]
  counters: Counter[]
  turns: number
  levelId: number
  result: GameResult | null
}>()
const emit = defineEmits<{
  'new-game': []
  'main-menu': []
}>()

defineOptions({ name: 'BGameMenu' })

const { t } = useI18n()

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
    const count = Math.max(0, objective.count - collected)

    return {
      type: objective.type,
      count,
      completed: count === 0,
    }
  })
})
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-game-menu";
</style>
