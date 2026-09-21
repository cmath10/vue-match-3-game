<template>
    <div class="b-game-layout__result">
        <div class="b-game-layout__result-content">
            <div class="b-game-layout__result-title">
                {{ result === 'win' ? t('result.win') : t('result.lose') }}
            </div>

            <div class="b-game-layout__result-actions">
                <button
                    class="btn btn-outline-light"
                    type="button"
                    @click="emit('play-again')"
                >
                    {{ t('result.playAgain') }}
                </button>
                <button
                    v-if="result === 'win' && nextLevelAvailable"
                    class="btn btn-light"
                    type="button"
                    @click="emit('next-level')"
                >
                    {{ t('result.nextLevel') }}
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

defineProps<{
  result: 'win' | 'lose'
  nextLevelAvailable: boolean
}>()
const emit = defineEmits<{
  'next-level': []
  'play-again': []
}>()

defineOptions({
  name: 'BGameResultOverlay',
})

const { t } = useI18n()
</script>
