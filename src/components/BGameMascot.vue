<template>
    <span
        :class="{
            'b-game-mascot': true,
            'b-game-mascot--sad': sad,
        }"
        aria-hidden="true"
    >
        <span class="b-game-mascot__portrait b-game-mascot__portrait--open" />
        <span class="b-game-mascot__portrait b-game-mascot__portrait--blink" />
        <span class="b-game-mascot__portrait b-game-mascot__portrait--sad" />
    </span>
</template>

<script lang="ts" setup>
defineProps<{ sad: boolean }>()
defineOptions({ name: 'BGameMascot' })
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-game-mascot";
</style>
