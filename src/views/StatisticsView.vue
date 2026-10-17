<template>
    <main class="b-app-screen b-app-screen--immersive">
        <section class="b-statistics">
            <header class="b-app-screen__header">
                <div>
                    <p class="b-app-screen__eyebrow">
                        {{ t('statistics.eyebrow') }}
                    </p>
                    <h1>{{ t('statistics.title') }}</h1>
                </div>

                <div class="b-app-screen__actions">
                    <BLocaleSwitcher />
                    <RouterLink :to="{ name: 'home' }" class="btn btn-outline-light">
                        {{ t('navigation.home') }}
                    </RouterLink>
                </div>
            </header>

            <div class="b-statistics__summary">
                <article
                    v-for="item in summary"
                    :key="item.id"
                    :class="{
                        'b-statistics__metric': true,
                        [`b-statistics__metric--${item.id}`]: true,
                    }"
                >
                    <svg
                        v-if="item.icon"
                        aria-hidden="true"
                        class="b-statistics__metric-art"
                        viewBox="0 0 48 48"
                    >
                        <path :d="item.icon" />
                    </svg>
                    <BGameTile
                        v-else-if="item.tile"
                        :type="item.tile"
                        aria-hidden="true"
                        class="b-statistics__metric-art"
                    />
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                </article>
            </div>

            <div class="b-statistics__details">
                <section class="b-statistics__group">
                    <h2>{{ t('statistics.tilesCollected') }}</h2>
                    <dl>
                        <div v-for="type in objectiveTypes" :key="type">
                            <dt>
                                <BGameTile
                                    :type="type"
                                    :small="true"
                                    aria-hidden="true"
                                />
                                <span>{{ tileLabels[type] }}</span>
                            </dt>
                            <dd>{{ statistics.tilesCollected[type] ?? 0 }}</dd>
                        </div>
                    </dl>
                </section>

                <section class="b-statistics__group">
                    <h2>{{ t('statistics.boostersUsed') }}</h2>
                    <dl>
                        <div v-for="type in boosterTypes" :key="type">
                            <dt>
                                <BGameTile
                                    :type="type"
                                    :small="true"
                                    aria-hidden="true"
                                />
                                <span>{{ tileLabels[type] }}</span>
                            </dt>
                            <dd>{{ statistics.boostersUsed[type] ?? 0 }}</dd>
                        </div>
                    </dl>
                </section>
            </div>
        </section>
    </main>
</template>

<script lang="ts" setup>
import type { TileVisualType } from '@/domain/enums'

import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import BGameTile from '@/components/BGameTile.vue'
import BLocaleSwitcher from '@/components/BLocaleSwitcher.vue'

import { BoosterType } from '@/domain/enums'
import { getCountTotal } from '@/domain/progress'
import { initializePlayerProgress } from '@/state/playerProgress'
import { SpecialTileType, TileType } from '@/domain/enums'
import { usePlayerProgress } from '@/state/playerProgress'

defineOptions({ name: 'StatisticsView' })

const { t } = useI18n()
const { state } = usePlayerProgress()
const statistics = computed(() => state.value.statistics)
const objectiveTypes = [...Object.values(TileType), ...Object.values(SpecialTileType)]
const boosterTypes = Object.values(BoosterType)
const tileLabels = computed(() => ({
  [TileType.SweetsBarbaris]: t('tiles.sweets-barbaris'),
  [TileType.SweetsFish]: t('tiles.sweets-fish'),
  [TileType.SweetsRooster]: t('tiles.sweets-rooster'),
  [TileType.SweetsPillow]: t('tiles.sweets-pillow'),
  [TileType.SweetsBird]: t('tiles.sweets-bird'),
  [SpecialTileType.Mug]: t('tiles.special-mug'),
  [SpecialTileType.Package]: t('tiles.special-package'),
  [SpecialTileType.Cookie]: t('tiles.special-cookie'),
  [BoosterType.RowFirecracker]: t('tiles.booster-row-firecracker'),
  [BoosterType.ColumnFirecracker]: t('tiles.booster-column-firecracker'),
  [BoosterType.AreaKettle]: t('tiles.booster-area-kettle'),
  [BoosterType.ButtonBox]: t('tiles.booster-button-box'),
}))
const metricIcons = {
  started: 'M18 12 36 24 18 36Z M24 4a20 20 0 1 0 0 40 20 20 0 0 0 0-40',
  completed: 'M10 43V6h28l-6 10 6 10H10 M18 6v20 M26 6v20 M10 16h22',
  won: 'M14 6h20v12a10 10 0 0 1-20 0Z M14 10H6v5a10 10 0 0 0 10 10 M34 10h8v5a10 10 0 0 1-10 10 M24 28v10 M15 43v-5h18v5Z',
  lost: 'M24 12C14-2-2 12 8 24L24 42 40 24C50 12 34-2 24 12Z M24 12l-5 9 10 5-7 9',
  turns: 'M6 15h34 M31 6l9 9-9 9 M42 33H8 M17 24l-9 9 9 9',
}
const summary = computed<{
  id: string
  label: string
  value: number
  icon?: string
  tile?: TileVisualType
}[]>(() => [
  { id: 'started', label: t('statistics.gamesStarted'), value: statistics.value.gamesStarted, icon: metricIcons.started },
  { id: 'completed', label: t('statistics.gamesCompleted'), value: statistics.value.gamesCompleted, icon: metricIcons.completed },
  { id: 'won', label: t('statistics.gamesWon'), value: statistics.value.gamesWon, icon: metricIcons.won },
  { id: 'lost', label: t('statistics.gamesLost'), value: statistics.value.gamesLost, icon: metricIcons.lost },
  { id: 'turns', label: t('statistics.turnsPlayed'), value: statistics.value.turnsPlayed, icon: metricIcons.turns },
  { id: 'tiles', label: t('statistics.collectedTotal'), value: getCountTotal(statistics.value.tilesCollected), tile: TileType.SweetsBarbaris },
  { id: 'boosters', label: t('statistics.boostersTotal'), value: getCountTotal(statistics.value.boostersUsed), tile: BoosterType.RowFirecracker },
])

onMounted(() => {
  void initializePlayerProgress()
})
</script>
