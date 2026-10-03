/** Render the configured surfaces beside the package's route selection for the app runtime. */
export function surfacesTemplate(surfaces: Record<string, string>, routesPath: string): string {
  return `export { selectRoutes } from ${JSON.stringify(routesPath)}

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
