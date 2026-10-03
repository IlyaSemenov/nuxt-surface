<script setup lang="ts">
import { computed } from "vue"

import { useRoute } from "#app"

const route = useRoute()
const path = computed(() => {
  const value = route.params.path
  return Array.isArray(value) ? value.join("/") : value
})
</script>

<template>
  <p id="page">site-files-{{ path }}</p>
</template>
