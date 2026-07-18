<template>
    <div
        :class="{
            'b-game-tile': true,
            'b-game-tile--small': small,
            [`b-game-tile--${type}`]: true,
            [`b-game-tile--blocker-${blocker}`]: blocker,
            [`b-game-tile--cookie-jam-${cookieJam}`]: cookieJam,
        }"
    />
</template>

<script lang="ts" setup>
import type { TileVisualType } from '@/enums/game'

import { computed } from 'vue'

import { SPECIAL_TILE_TYPE } from '@/enums/game'

const props = withDefaults(defineProps<{
  type: TileVisualType
  small?: boolean
  health?: number
  blocker?: SPECIAL_TILE_TYPE.PACKAGE
}>(), {
  small: false,
  health: undefined,
  blocker: undefined,
})

defineOptions({
  name: 'BGameTile',
})

const cookieJam = computed(() => {
  if (props.type !== SPECIAL_TILE_TYPE.COOKIE || props.health === undefined) {
    return null
  }

  return props.health > 1 ? props.health - 1 : null
})
</script>

<style lang="scss">
@import "../../assets/scss/blocks/b-game-tile";
</style>
