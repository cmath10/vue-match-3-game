<template>
    <div class="b-game-menu">
        <h1 class="b-game-menu__title">
            {{ t('app.title') }}
        </h1>

        <div
            :aria-label="t('menu.language')"
            class="b-game-menu__language"
            role="group"
        >
            <button
                v-for="option in localeOptions"
                :key="option.code"
                :aria-label="option.label"
                :aria-pressed="locale === option.code"
                :class="{ 'b-game-menu__language-button--active': locale === option.code }"
                class="b-game-menu__language-button"
                type="button"
                @click="setLocale(option.code)"
            >
                {{ option.flag }}
            </button>
        </div>

        <div class="b-game-menu__objectives">
            <div
                v-for="(objective, index) in objectivesComputed"
                :key="index"
                :class="{ 'b-game-menu__objective--completed': objective.completed }"
                :data-objective-type="objective.type"
                class="b-game-menu__objective"
            >
                <span class="b-game-menu__objective-tile">
                    <b-game-tile :type="objective.type" :small="true" />
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

        <button
            class="b-game-menu__button btn btn-outline-light"
            type="button"
            @click="emit('new-game')"
        >
            {{ t('menu.newGame') }}
        </button>
    </div>
</template>

<script lang="ts" setup>
import type { Counter, Objective } from '@/types/game'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import BGameTile from '@/components/blocks/BGameTile.vue'

import { localeOptions, setLocale } from '@/i18n'

const props = defineProps<{
  objectives: Objective[]
  counters: Counter[]
  turns: number
}>()
const emit = defineEmits<{
  'new-game': []
}>()

defineOptions({ name: 'BGameMenu' })

const { locale, t } = useI18n()

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
@import "../../assets/scss/blocks/b-game-menu";
</style>
