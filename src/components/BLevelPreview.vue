<template>
    <span
        :style="previewStyle"
        aria-hidden="true"
        class="b-level-preview"
    >
        <BBoardSurface
            :surface="preview.surface"
            class="b-level-preview__surface"
        />
        <span
            v-for="tile in preview.tiles"
            :key="tile.key"
            :style="tile.style"
            class="b-level-preview__cell"
        >
            <BGameTile
                :blocker="tile.blocker"
                :health="tile.health"
                :type="tile.type"
                class="b-level-preview__tile"
            />
        </span>
    </span>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import BBoardSurface from '@/components/BBoardSurface.vue'
import BGameTile from '@/components/BGameTile.vue'

import { createLevelPreview } from '@/presentation/levelPreview'
import { getCatalogLevel } from '@/domain/levels/catalog'

const props = defineProps<{
  levelId: number
}>()

defineOptions({ name: 'BLevelPreview' })

const preview = computed(() => createLevelPreview(getCatalogLevel(props.levelId)))
const previewStyle = computed(() => ({
  '--preview-column-count': preview.value.width,
  '--preview-row-count': preview.value.height,
}))
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-level-preview";
</style>
