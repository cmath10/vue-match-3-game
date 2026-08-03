<template>
    <RouterView />
</template>

<script lang="ts" setup>
defineOptions({ name: 'App' })
</script>

<style lang="scss">
@import "assets/scss/variables";
@import "bootstrap/scss/bootstrap";
@import "assets/scss/normalize";
@import "assets/scss/blocks/b-app-screen";
@import "assets/scss/blocks/b-game-layout";
@import "assets/scss/blocks/b-game-ground";
@import "assets/scss/transitions/t-game-fade";
</style>
