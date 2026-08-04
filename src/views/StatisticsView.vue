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
                    :key="item.label"
                    class="b-statistics__metric"
                >
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                </article>
            </div>

            <div class="b-statistics__details">
                <section class="b-statistics__group">
                    <h2>{{ t('statistics.tilesCollected') }}</h2>
                    <dl>
                        <div v-for="type in objectiveTypes" :key="type">
                            <dt>{{ tileLabels[type] }}</dt>
                            <dd>{{ statistics.tilesCollected[type] ?? 0 }}</dd>
                        </div>
                    </dl>
                </section>

                <section class="b-statistics__group">
                    <h2>{{ t('statistics.boostersUsed') }}</h2>
                    <dl>
                        <div v-for="type in boosterTypes" :key="type">
                            <dt>{{ tileLabels[type] }}</dt>
                            <dd>{{ statistics.boostersUsed[type] ?? 0 }}</dd>
                        </div>
                    </dl>
                </section>
            </div>
        </section>
    </main>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

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
const summary = computed(() => [
  { label: t('statistics.gamesStarted'), value: statistics.value.gamesStarted },
  { label: t('statistics.gamesCompleted'), value: statistics.value.gamesCompleted },
  { label: t('statistics.gamesWon'), value: statistics.value.gamesWon },
  { label: t('statistics.gamesLost'), value: statistics.value.gamesLost },
  { label: t('statistics.turnsPlayed'), value: statistics.value.turnsPlayed },
  { label: t('statistics.collectedTotal'), value: getCountTotal(statistics.value.tilesCollected) },
  { label: t('statistics.boostersTotal'), value: getCountTotal(statistics.value.boostersUsed) },
])

onMounted(() => {
  void initializePlayerProgress()
})
</script>
