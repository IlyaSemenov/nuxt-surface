<script setup lang="ts">
import { useRoute } from "#app"

definePageMeta({ childMeta: "kept" })
const route = useRoute()
</script>

<template>
  <p id="page">site-guide-{{ route.params.id }}</p>
</template>
