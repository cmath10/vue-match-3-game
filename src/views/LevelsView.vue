<template>
    <main class="b-app-screen b-app-screen--immersive">
        <section class="b-levels">
            <header class="b-app-screen__header">
                <div>
                    <p class="b-app-screen__eyebrow">
                        {{ t('levels.eyebrow') }}
                    </p>
                    <h1>{{ t('levels.title') }}</h1>
                </div>

                <div class="b-app-screen__actions">
                    <BLocaleSwitcher />
                    <RouterLink :to="{ name: 'home' }" class="btn btn-outline-light">
                        {{ t('navigation.home') }}
                    </RouterLink>
                </div>
            </header>

            <VSwiper
                v-if="initialized"
                :aria-label="t('levels.list')"
                :breakpoints="breakpoints"
                :initial-slide="initialSlide"
                :modules="swiperModules"
                class="b-levels__carousel"
                role="list"
                @breakpoint="updateSwiperState"
                @resize="updateSwiperState"
                @slide-change="updateSwiperState"
                @swiper="setSwiper"
            >
                <VSwiperSlide
                    v-for="levelId in levelIds"
                    :key="levelId"
                    role="listitem"
                >
                    <RouterLink
                        v-if="isUnlocked(levelId)"
                        :aria-label="t('levels.open', { level: levelId })"
                        :class="{
                            'b-levels__tile': true,
                            'b-levels__tile--current': levelId === state.highestUnlockedLevel,
                        }"
                        :to="{ name: 'game', params: { levelId } }"
                    >
                        <span class="b-levels__number">{{ levelId }}</span>
                        <BLevelPreview
                            v-if="hasCompleted(levelId)"
                            :level-id="levelId"
                        />
                        <span class="b-levels__status">{{ getStatusLabel(levelId) }}</span>
                    </RouterLink>

                    <div
                        v-else
                        :aria-label="t('levels.locked', { level: levelId })"
                        aria-disabled="true"
                        class="b-levels__tile b-levels__tile--locked"
                    >
                        <span aria-hidden="true" class="b-levels__lock">🔒</span>
                        <span class="b-levels__number">{{ levelId }}</span>
                        <span class="b-levels__status">{{ t('levels.status.locked') }}</span>
                    </div>
                </VSwiperSlide>
            </VSwiper>

            <div v-if="initialized" class="b-levels__controls">
                <button
                    :aria-label="t('levels.previous')"
                    :disabled="isBeginning"
                    class="b-levels__control"
                    type="button"
                    @click="swiper?.slidePrev()"
                >
                    ←
                </button>
                <span>{{ activePage }} / {{ pageCount }}</span>
                <button
                    :aria-label="t('levels.next')"
                    :disabled="isEnd"
                    class="b-levels__control"
                    type="button"
                    @click="swiper?.slideNext()"
                >
                    →
                </button>
            </div>

            <p v-else class="b-levels__preparing">
                {{ t('welcome.preparing') }}
            </p>

            <p class="b-levels__hint">
                {{ t('levels.hint') }}
            </p>
        </section>
    </main>
</template>

<script lang="ts" setup>
import 'swiper/css'
import 'swiper/css/grid'

import type { Swiper as SwiperClass } from 'swiper'
import type { SwiperOptions } from 'swiper/types'

import { Grid } from 'swiper/modules'
import { Swiper as VSwiper, SwiperSlide as VSwiperSlide } from 'swiper/vue'

import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import BLevelPreview from '@/components/BLevelPreview.vue'
import BLocaleSwitcher from '@/components/BLocaleSwitcher.vue'

import { getLevelDisplayStatus, getLevelIds } from '@/domain/progress'
import { initializePlayerProgress } from '@/state/playerProgress'
import { isLevelUnlocked } from '@/domain/progress'
import { usePlayerProgress } from '@/state/playerProgress'

defineOptions({ name: 'LevelsView' })

const MOBILE_BREAKPOINT = 576
const LARGE_TABLET_BREAKPOINT = 900
const DESKTOP_BREAKPOINT = 1200
const WIDE_DESKTOP_BREAKPOINT = 1600
const MOBILE_SLIDES = 1.15
const TABLET_SLIDES = 2.2
const LARGE_TABLET_SLIDES = 3
const DESKTOP_SLIDES = 4
const WIDE_DESKTOP_SLIDES = 5
const ONE_ROW = 1
const TWO_ROWS = 2
const SMALL_GAP = 12
const MEDIUM_GAP = 16
const LARGE_GAP = 20

type ResponsiveSwiperOptions = SwiperOptions & {
  grid?: { rows: number; fill?: 'row' | 'column' }
}

const { t } = useI18n()
const { initialized, state } = usePlayerProgress()
const levelIds = getLevelIds()
const swiperModules = [Grid]
const swiper = ref<SwiperClass | null>(null)
const isBeginning = ref(true)
const isEnd = ref(false)
const activePage = ref(1)
const pageCount = ref(1)
const statusLabels = computed(() => ({
  locked: t('levels.status.locked'),
  new: t('levels.status.new'),
  'in-progress': t('levels.status.in-progress'),
  completed: t('levels.status.completed'),
  lose: t('levels.status.lose'),
}))
const breakpoints: Record<number, ResponsiveSwiperOptions> = {
  0: {
    slidesPerView: MOBILE_SLIDES,
    slidesPerGroup: ONE_ROW,
    spaceBetween: SMALL_GAP,
    grid: { rows: ONE_ROW },
  },
  [MOBILE_BREAKPOINT]: {
    slidesPerView: TABLET_SLIDES,
    slidesPerGroup: TWO_ROWS,
    spaceBetween: MEDIUM_GAP,
    grid: { rows: ONE_ROW },
  },
  [LARGE_TABLET_BREAKPOINT]: {
    slidesPerView: LARGE_TABLET_SLIDES,
    slidesPerGroup: LARGE_TABLET_SLIDES,
    spaceBetween: MEDIUM_GAP,
    grid: { rows: TWO_ROWS, fill: 'row' },
  },
  [DESKTOP_BREAKPOINT]: {
    slidesPerView: DESKTOP_SLIDES,
    slidesPerGroup: DESKTOP_SLIDES,
    spaceBetween: LARGE_GAP,
    grid: { rows: TWO_ROWS, fill: 'row' },
  },
  [WIDE_DESKTOP_BREAKPOINT]: {
    slidesPerView: WIDE_DESKTOP_SLIDES,
    slidesPerGroup: WIDE_DESKTOP_SLIDES,
    spaceBetween: LARGE_GAP,
    grid: { rows: TWO_ROWS, fill: 'row' },
  },
}
const initialSlide = computed(() => Math.max(0, state.value.highestUnlockedLevel - 1))

const isUnlocked = (levelId: number): boolean => isLevelUnlocked(state.value, levelId)
const hasCompleted = (levelId: number): boolean => state.value.levels[levelId]?.completed === true
const getStatusLabel = (levelId: number): string => (
  statusLabels.value[getLevelDisplayStatus(state.value, levelId)]
)
const updateSwiperState = (instance: SwiperClass): void => {
  isBeginning.value = instance.isBeginning
  isEnd.value = instance.isEnd
  activePage.value = instance.snapIndex + 1
  pageCount.value = Math.max(1, instance.snapGrid.length)
}
const setSwiper = (instance: SwiperClass): void => {
  swiper.value = instance
  updateSwiperState(instance)
}

onMounted(() => {
  void initializePlayerProgress()
})
</script>
