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
import type { TileVisualType } from '@/domain/enums'

import { computed } from 'vue'

import { SpecialTileType } from '@/domain/enums'

const props = withDefaults(defineProps<{
  type: TileVisualType
  small?: boolean
  health?: number
  blocker?: SpecialTileType.Package
}>(), {
  small: false,
  health: undefined,
  blocker: undefined,
})

defineOptions({
  name: 'BGameTile',
})

const cookieJam = computed(() => {
  if (props.type !== SpecialTileType.Cookie || props.health === undefined) {
    return null
  }

  return props.health > 1 ? props.health - 1 : null
})
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-game-tile";
</style>
