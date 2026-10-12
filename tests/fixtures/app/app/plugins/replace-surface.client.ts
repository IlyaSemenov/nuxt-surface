import type { SurfaceId } from "#nuxt-surface"
import { replaceSurface } from "#nuxt-surface/testing"

// Browser tests drive the helper through window; restores run in reverse order like test cleanups.
// A restore stays on the stack until it succeeds, so a test can retry it.
export default defineNuxtPlugin(nuxtApp => {
  const restores: Array<() => Promise<void>> = []
  Object.assign(window, {
    surfaceTesting: {
      replace: async (id: SurfaceId | null) => {
        restores.push(await nuxtApp.runWithContext(() => replaceSurface(id)))
      },
      restore: async () => {
        await restores.at(-1)!()
        restores.pop()
      },
    },
  })
})
