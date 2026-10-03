import { selectSurfaceRoutes, type SurfaceId, useSurface } from "#nuxt-surface"

const id: "site" | "docs" | "tenant" | null = useSurface()
// @ts-expect-error A document without a surface returns null.
const required: SurfaceId = useSurface()
const valid: SurfaceId = "site"
// @ts-expect-error Configured surface IDs are a closed union.
const invalid: SurfaceId = "missing"
selectSurfaceRoutes([], () => null)
// @ts-expect-error Selection must be synchronous.
selectSurfaceRoutes([], async () => valid)
// @ts-expect-error Selectors cannot return unknown IDs.
selectSurfaceRoutes([], () => "missing")
// @ts-expect-error Only null selects no surface.
selectSurfaceRoutes([], () => undefined)
void [id, required, invalid]
