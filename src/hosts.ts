// Pure host mapping for Nitro, the Nuxt app, and server packages outside Nuxt.

/** A request host that no surface claims, described for an application-specific lookup. */
export type UnmappedHost =
  /** A subdomain of the base hostname, possibly nested, such as `acme` or `eu.acme`. */
  | { subdomain: string }
  /** Any other hostname, including the base hostname when no surface claims it. */
  | { domain: string }

/** Hosts of the surfaces passed to `defineSurfaceHosts()`. */
export interface SurfaceHosts<Id extends string> {
  /** Find the surface of a request hostname, or describe a host that no surface claims. */
  resolve(hostname: string, baseHostname: string): { surface: Id } | UnmappedHost
  /** Build an absolute URL on a surface's host, keeping the protocol and port of the base URL. */
  url(baseUrl: string | URL, surface: Id, path?: string): string
}

/** Map surfaces to subdomains of a base hostname; `null` places a surface on the base hostname itself. */
export function defineSurfaceHosts<const T extends Record<string, string | null>>(
  subdomains: T,
): SurfaceHosts<keyof T & string> {
  const surfaceBySubdomain = new Map<string | null, keyof T & string>()
  const subdomainBySurface = new Map<string, string | null>()
  for (const [surface, value] of Object.entries(subdomains)) {
    if (value === "")
      throw new Error(
        `nuxt-surface: surface ${surface} has an empty subdomain. Use null for the base host.`,
      )
    const subdomain = value === null ? null : value.toLowerCase()
    const other = surfaceBySubdomain.get(subdomain)
    if (other !== undefined)
      throw new Error(
        `nuxt-surface: surfaces ${other} and ${surface} share the ${subdomain ?? "base"} host.`,
      )
    surfaceBySubdomain.set(subdomain, surface)
    subdomainBySurface.set(surface, subdomain)
  }

  return {
    resolve(hostname, baseHostname) {
      const host = hostname.toLowerCase()
      const base = baseHostname.toLowerCase()
      const subdomain =
        host === base
          ? null
          : host.endsWith(`.${base}`)
            ? host.slice(0, -base.length - 1)
            : undefined
      if (subdomain === undefined) return { domain: host }
      const surface = surfaceBySubdomain.get(subdomain)
      if (surface !== undefined) return { surface }
      return subdomain === null ? { domain: host } : { subdomain }
    },
    url(baseUrl, surface, path = "/") {
      const base = new URL(baseUrl)
      const url = new URL(path, base)
      // Compare parsed URLs: backslashes and whitespace can also change the host; blob: keeps the inner origin.
      if (url.origin !== base.origin || url.protocol !== base.protocol)
        throw new Error("nuxt-surface: path must not change the base URL's origin.")
      const subdomain = subdomainBySurface.get(surface)
      if (subdomain) url.hostname = `${subdomain}.${url.hostname}`
      return url.href
    },
  }
}
