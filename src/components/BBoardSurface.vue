<template>
    <svg
        :viewBox="surface.viewBox"
        aria-hidden="true"
        class="b-board-surface"
        preserveAspectRatio="none"
    >
        <path :d="surface.fillPath" class="b-board-surface__fill" />
        <path :d="surface.borderPath" class="b-board-surface__border" />
    </svg>
</template>

<script lang="ts" setup>
import type { BoardSurface } from '@/presentation/boardSurface'

defineProps<{
  surface: BoardSurface
}>()

defineOptions({ name: 'BBoardSurface' })
</script>
