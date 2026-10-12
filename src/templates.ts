/** Render the configured surfaces beside the package's route selection for the app runtime. */
export function surfacesTemplate(
  surfaces: Record<string, string>,
  routesPath: string,
  infrastructureComponent: string,
): string {
  return `export { isSurfaceIdOrNull, selectRoutes } from ${JSON.stringify(routesPath)}
export { default as infrastructureComponent } from ${JSON.stringify(infrastructureComponent)}

// The payload carries the SSR selection through hydration; page HMR reuses the same app state.
export const stateKey = "nuxt-surface"

export const surfaces = ${JSON.stringify(surfaces, null, 2)}
`
}

/** Render runtime declarations with the configured surface IDs. */
export function clientTypesTemplate(ids: string[]): string {
  return `/** A surface ID declared in \`surface.surfaces\`. */
export type SurfaceId = ${ids.map(id => JSON.stringify(id)).join(" | ")}

/** Read the surface selected for the current Nuxt app, or null for a document without one. */
export declare function useSurface(): SurfaceId | null

/** Select a surface once per Nuxt app and return its routes at public paths; null selects no routes. */
export declare function selectSurfaceRoutes<T extends { path: string }>(routes: readonly T[], select: () => SurfaceId | null): T[]
`
}

/** Render declarations of the test helpers. */
export function testingTypesTemplate(): string {
  return `import type { SurfaceId } from "./client"

/**
 * Switch the running Nuxt app to another surface and return a function that switches it back.
 *
 * For tests that share one Nuxt app.
 * Routes added with router.addRoute() are dropped, and the current route is not matched again.
 */
export declare function replaceSurface(id: SurfaceId | null): Promise<() => Promise<void>>
`
}
