<template>
    <div>
        <h1>Game</h1>

        <div class="game-ground">
            <div
                v-for="cell in ground"
                :key="cell.x + '-' + cell.y"
                class="game-ground__cell"
                :class="{ 'game-ground__cell--selected': cell.selected }"
                @click="onCellClick(cell)"
            >
                {{ cell.x + 1 }}&times;{{ cell.y + 1 }}
            </div>
        </div>
    </div>
</template>

<!--suppress JSUnusedGlobalSymbols -->
<script lang="ts">
  /* eslint-disable no-magic-numbers */

  import { Vue, Component } from 'vue-property-decorator'

  type Cell = {
    x: number
    y: number
    selected: boolean
  }

  const WIDTH = 9
  const HEIGHT = 7

  @Component({
    name: 'MainView',
  })
  export default class MainView extends Vue {
    ground: Cell[] = []

    created () {
      for (let i = 0; i < HEIGHT; i++) {
        for (let j = 0; j < WIDTH; j++) {
          this.ground.push({
            x: i,
            y: j,
            selected: false,
          })
        }
      }
    }

    onCellClick (cell: Cell) {
      cell.selected = !cell.selected
    }
  }
</script>

<style lang="scss">
    @import "./assets/scss/normalize";
    @import "./assets/scss/blocks/game-ground";
</style>
