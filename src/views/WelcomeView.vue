<template>
    <main class="b-app-screen b-app-screen--welcome">
        <BLocaleSwitcher class="b-welcome__language" />

        <section class="b-welcome">
            <div class="b-welcome__hero">
                <p class="b-app-screen__eyebrow">
                    {{ t('welcome.eyebrow') }}
                </p>

                <h1 class="b-welcome__title">
                    {{ t('welcome.title') }}
                </h1>

                <p class="b-welcome__lead">
                    {{ t('welcome.lead') }}
                </p>
            </div>

            <div v-if="!ready" class="b-welcome__preparation">
                <div class="b-welcome__progress-copy">
                    <span>{{ t('welcome.preparing') }}</span>
                    <span>{{ progress }}%</span>
                </div>

                <div
                    :aria-label="t('welcome.preparing')"
                    :aria-valuenow="progress"
                    aria-valuemax="100"
                    aria-valuemin="0"
                    class="b-welcome__progress"
                    role="progressbar"
                >
                    <span :style="{ width: `${progress}%` }" />
                </div>
            </div>

            <nav
                v-else
                :aria-label="t('welcome.menu')"
                class="b-welcome__menu"
            >
                <button
                    v-if="primaryAction"
                    class="btn btn-light b-welcome__action b-welcome__action--primary"
                    type="button"
                    @click="openPrimaryAction"
                >
                    {{ primaryAction.label }}
                </button>

                <RouterLink
                    v-if="hasPlayed"
                    :to="{ name: 'levels' }"
                    class="btn btn-outline-light b-welcome__action"
                >
                    {{ t('welcome.levels') }}
                </RouterLink>

                <RouterLink
                    v-if="hasPlayed"
                    :to="{ name: 'statistics' }"
                    class="btn btn-outline-light b-welcome__action"
                >
                    {{ t('welcome.statistics') }}
                </RouterLink>
            </nav>

            <div aria-hidden="true" class="b-preload-assets">
                <img
                    v-for="url in assetUrls"
                    :key="url"
                    :src="url"
                    alt=""
                    loading="eager"
                    @error="markAssetReady(url)"
                    @load="markAssetReady(url)"
                >
            </div>
        </section>
    </main>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import BLocaleSwitcher from '@/components/BLocaleSwitcher.vue'

import { assetUrls } from '@/assets'
import { getSnapshotLevelId } from '@/domain/progress'
import { initializePlayerProgress, usePlayerProgress } from '@/state/playerProgress'

defineOptions({ name: 'WelcomeView' })

const { t } = useI18n()
const router = useRouter()
const { hasPlayed, latestInProgressGame } = usePlayerProgress()
const loadedAssets = new Set<string>()
const PERCENT_TOTAL = 100
const loadedAssetCount = ref(0)
const stateReady = ref(false)
const operationCount = assetUrls.length + 1

const completedOperations = computed(() => loadedAssetCount.value + Number(stateReady.value))
const progress = computed(() => Math.round(completedOperations.value / operationCount * PERCENT_TOTAL))
const ready = computed(() => completedOperations.value === operationCount)
const primaryAction = computed(() => {
  if (latestInProgressGame.value) {
    return { label: t('welcome.continue'), levelId: getSnapshotLevelId(latestInProgressGame.value) }
  }

  return hasPlayed.value ? null : { label: t('welcome.start'), levelId: 1 }
})

const markAssetReady = (url: string): void => {
  if (!loadedAssets.has(url)) {
    loadedAssets.add(url)
    loadedAssetCount.value++
  }
}

const openPrimaryAction = (): void => {
  if (primaryAction.value) {
    void router.push({
      name: 'game',
      params: { levelId: primaryAction.value.levelId },
      query: latestInProgressGame.value ? { resume: '1' } : undefined,
    })
  }
}

onMounted(() => {
  void initializePlayerProgress().finally(() => {
    stateReady.value = true
  })
})
</script>
