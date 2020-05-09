<template>
    <div :class="classes" />
</template>

<script lang="ts">
  import { Vue, Component, Prop } from 'vue-property-decorator'
  import { Tile } from '@/types/game'

  import { TILE_TYPES } from '@/enums/game'

  @Component({
    name: 'BGameTile'
  })
  export default class BGameTile extends Vue {
    @Prop({
      required: true
    }) tile: Tile

    get classes () {
      return {
        'b-game-tile': true,
        'b-game-tile--blue': this.tile.value === TILE_TYPES.BLUE,
        'b-game-tile--green': this.tile.value === TILE_TYPES.GREEN,
        'b-game-tile--purple': this.tile.value === TILE_TYPES.PURPLE,
        'b-game-tile--red': this.tile.value === TILE_TYPES.RED,
        'b-game-tile--yellow': this.tile.value === TILE_TYPES.YELLOW,
      }
    }
  }
</script>

<style lang="scss">
    @import "../../assets/scss/blocks/b-game-tile";
</style>
