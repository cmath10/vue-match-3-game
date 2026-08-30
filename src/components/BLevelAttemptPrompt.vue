<template>
    <main class="b-app-screen b-app-screen--immersive">
        <section class="b-attempt-prompt">
            <p class="b-app-screen__eyebrow">
                {{ t('attempt.eyebrow', { level: getSnapshotLevelId(snapshot) }) }}
            </p>

            <h1>{{ t('attempt.title') }}</h1>
            <p class="b-attempt-prompt__lead">
                {{ t('attempt.lead') }}
            </p>

            <dl class="b-attempt-prompt__summary">
                <div>
                    <dt>{{ t('attempt.turns') }}</dt>
                    <dd>{{ snapshot.turns }}</dd>
                </div>
                <div>
                    <dt>{{ t('attempt.moves') }}</dt>
                    <dd>{{ snapshot.statistics.turnsPlayed }}</dd>
                </div>
                <div>
                    <dt>{{ t('attempt.objectives') }}</dt>
                    <dd>{{ completedObjectiveCount }} / {{ snapshot.objectives.length }}</dd>
                </div>
            </dl>

            <div class="b-attempt-prompt__actions">
                <button
                    class="btn btn-light"
                    type="button"
                    @click="emit('continue')"
                >
                    {{ t('attempt.continue') }}
                </button>
                <button
                    class="btn btn-outline-light"
                    type="button"
                    @click="emit('restart')"
                >
                    {{ t('attempt.restart') }}
                </button>
                <button
                    class="btn btn-link text-light"
                    type="button"
                    @click="emit('back')"
                >
                    {{ t('attempt.back') }}
                </button>
            </div>
        </section>
    </main>
</template>

<script lang="ts" setup>
import type { GameSnapshot } from '@/domain/progress'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { getSnapshotLevelId } from '@/domain/progress'

const props = defineProps<{ snapshot: GameSnapshot }>()
const emit = defineEmits<{
  continue: []
  restart: []
  back: []
}>()

defineOptions({ name: 'BLevelAttemptPrompt' })

const { t } = useI18n()
const completedObjectiveCount = computed(() => props.snapshot.objectives.filter(objective => {
  const collected = props.snapshot.counters.find(counter => counter.type === objective.type)?.count ?? 0

  return collected >= objective.count
}).length)
</script>
