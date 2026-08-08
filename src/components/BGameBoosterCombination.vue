<template>
    <div
        :class="{
            'b-game-booster-combination': true,
            [`b-game-booster-combination--${combination.type}`]: true,
        }"
        :style="getCombinationStyle(combination)"
    />
</template>

<script lang="ts" setup>
import type { BoosterCombination } from '@/domain/types'

defineProps<{
  combination: BoosterCombination
}>()

defineOptions({ name: 'BGameBoosterCombination' })

const getCombinationStyle = (combination: BoosterCombination) => ({
  '--combination-row': combination.source.row,
  '--combination-column': combination.source.column,
})
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-game-booster-combination";
</style>
