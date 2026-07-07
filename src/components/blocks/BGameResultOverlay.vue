<template>
    <div class="b-game-ground__result">
        <div class="b-game-ground__result-content">
            <div class="b-game-ground__result-title">
                {{ result === 'win' ? t('result.win') : t('result.lose') }}
            </div>

            <button
                class="btn btn-outline-light"
                type="button"
                @click="emit('play-again')"
            >
                {{ t('result.playAgain') }}
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

defineProps<{
  result: 'win' | 'lose'
}>()
const emit = defineEmits<{
  'play-again': []
}>()

defineOptions({
  name: 'BGameResultOverlay',
})

const { t } = useI18n()
</script>
