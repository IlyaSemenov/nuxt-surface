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
  for (const [surface, subdomain] of Object.entries(subdomains)) {
    const other = surfaceBySubdomain.get(subdomain)
    if (other)
      throw new Error(
        `nuxt-surface: surfaces ${other} and ${surface} share the ${subdomain ?? "base"} host.`,
      )
    surfaceBySubdomain.set(subdomain, surface)
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
      if (surface) return { surface }
      return subdomain === null ? { domain: host } : { subdomain }
    },
    url(baseUrl, surface, path = "/") {
      const url = new URL(path, baseUrl)
      const subdomain = subdomains[surface]
      if (subdomain) url.hostname = `${subdomain}.${url.hostname}`
      return url.href
    },
  }
}
