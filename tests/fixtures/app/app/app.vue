<script setup lang="ts">
import { onMounted, ref } from "vue"

import { useSurface } from "#nuxt-surface"

const surface = useSurface()
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})
</script>

<template>
  <div :data-hydrated="hydrated">
    <p id="surface">{{ surface }}</p>
    <NuxtLink id="guide" to="/section/42">Guide</NuxtLink>
    <NuxtLink id="switch-document" to="/" external>New document</NuxtLink>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
