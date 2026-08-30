<template>
    <div class="b-game-board-shell">
        <div class="b-game-ground">
            <div class="b-game-ground__cells">
                <div
                    v-for="cell in cells"
                    :key="cell.key"
                    :style="cell.style"
                    class="b-game-ground__cell"
                />
            </div>

            <div class="b-game-ground__tiles">
                <BGameTile
                    v-for="tile in tiles"
                    :key="tile.id"
                    :class="{
                        'b-game-ground__tile': true,
                        'b-game-ground__tile--selected': tile.selected,
                        'b-game-ground__tile--collecting': collectingTileIds.has(tile.id),
                        'b-game-tile--combining': combiningBoosterTileIds.has(tile.id),
                        'b-game-tile--detonating-kettle': detonatingKettleTileIds.has(tile.id),
                        'b-game-tile--landing': landingTileIds.has(tile.id),
                    }"
                    :data-tile-id="tile.id"
                    :blocker="tile.blocker?.type"
                    :health="tile.health"
                    :style="getTileStyle(tile)"
                    :type="tile.type"
                    @click="emit('tile-click', tile)"
                    @dblclick="emit('tile-double-click', tile)"
                    @pointercancel="emit('tile-pointer-cancel')"
                    @pointerdown="emit('tile-pointer-down', tile, $event)"
                    @pointerup="emit('tile-pointer-up', $event)"
                />

                <BGameBoosterCombination
                    v-if="boosterCombination"
                    :combination="boosterCombination"
                />
                <BGameButtonFlights :flights="buttonFlights" />
                <BGameBoosterEffects :effects="boosterEffects" />
                <BGameCookieBreakEffects :effects="cookieBreakEffects" />
                <BGameTileBreakEffects :effects="tileBreakEffects" />
            </div>

            <BGameResultOverlay
                v-if="result"
                :result="result"
                @play-again="emit('play-again')"
            />
        </div>

        <div class="b-game-board-shell__guides">
            <span
                v-for="guide in edgeGuides"
                :key="getBoardEdgeGuideKey(guide)"
                :class="getBoardEdgeGuideClasses(guide)"
                :style="getBoardEdgeGuideStyle(guide)"
            />
        </div>
    </div>
</template>

<script lang="ts" setup>
import type { BoardEdgeGuide } from '@/domain/levels/types'
import type { BoosterCombination } from '@/domain/types'
import type { BoosterVisualEffect } from '@/composables/useBoosterAnimation'
import type { ButtonFlight } from '@/composables/useButtonCollection'
import type { CookieBreakEffect } from '@/composables/useCookieBreakAnimation'
import type { GameCell } from '@/presentation/tiles'
import type { TileBreakEffect } from '@/composables/useTileBreakAnimation'

import type { GameResult, Tile } from '@/domain/types'

import BGameBoosterCombination from '@/components/BGameBoosterCombination.vue'
import BGameBoosterEffects from '@/components/BGameBoosterEffects.vue'
import BGameButtonFlights from '@/components/BGameButtonFlights.vue'
import BGameCookieBreakEffects from '@/components/BGameCookieBreakEffects.vue'
import BGameResultOverlay from '@/components/BGameResultOverlay.vue'
import BGameTile from '@/components/BGameTile.vue'
import BGameTileBreakEffects from '@/components/BGameTileBreakEffects.vue'

import {
  getBoardEdgeGuideClasses,
  getBoardEdgeGuideKey,
  getBoardEdgeGuideStyle,
  getTileStyle,
} from '@/presentation/tiles'

defineProps<{
  cells: GameCell[]
  edgeGuides: readonly BoardEdgeGuide[]
  tiles: Tile[]
  collectingTileIds: Set<number>
  combiningBoosterTileIds: Set<number>
  detonatingKettleTileIds: Set<number>
  landingTileIds: Set<number>
  buttonFlights: ButtonFlight[]
  boosterEffects: BoosterVisualEffect[]
  boosterCombination: BoosterCombination | null
  cookieBreakEffects: CookieBreakEffect[]
  tileBreakEffects: TileBreakEffect[]
  result: GameResult | null
}>()

const emit = defineEmits<{
  'play-again': []
  'tile-click': [tile: Tile]
  'tile-double-click': [tile: Tile]
  'tile-pointer-cancel': []
  'tile-pointer-down': [tile: Tile, event: PointerEvent]
  'tile-pointer-up': [event: PointerEvent]
}>()

defineOptions({ name: 'BGameBoard' })
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-game-board-shell";
</style>
