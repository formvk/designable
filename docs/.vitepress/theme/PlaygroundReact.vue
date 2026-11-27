<script setup lang="ts">
import type { Root } from 'react-dom/client'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { mountPlayground } from './mountPlayground'

const container = ref<HTMLDivElement>()
let root: Root | undefined

onMounted(async () => {
  if (!container.value) return
  root = await mountPlayground(container.value)
})

onBeforeUnmount(() => {
  root?.unmount()
  root = undefined
})
</script>

<template>
  <div ref="container" class="playground-react"></div>
</template>

<style scoped>
.playground-react {
  position: relative;
  width: 100%;
  height: calc(100vh - var(--vp-nav-height));
  overflow: hidden;
}
</style>
