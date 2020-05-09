<template>
    <div id="app">
        <h1>Game</h1>
    </div>
</template>

<script lang="ts">
  import { Vue, Component } from 'vue-property-decorator'

  @Component({
    name: 'MainView',
  })
  export default class MainView extends Vue {
  }
</script>

<style>
    #app {
        font-family: Avenir, Helvetica, Arial, sans-serif;
    }
</style>
