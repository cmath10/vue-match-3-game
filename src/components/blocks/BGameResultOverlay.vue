<template>
    <div class="b-game-ground__result">
        <div class="b-game-ground__result-content">
            <div class="b-game-ground__result-title">
                {{ result === 'win' ? 'You win!' : 'Game over' }}
            </div>

            <button
                class="btn btn-outline-light"
                type="button"
                @click="emit('play-again')"
            >
                Play again
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
defineProps<{
  result: 'win' | 'lose'
}>()
const emit = defineEmits<{
  'play-again': []
}>()

defineOptions({
  name: 'BGameResultOverlay',
})
</script>
