import module, { type ModuleOptions } from "nuxt-surface"
import { defineSurfaceHosts, type UnmappedHost } from "nuxt-surface/hosts"

const options: ModuleOptions = { surfaces: { docs: "/docs" } }
const hosts = defineSurfaceHosts({ site: null, docs: "docs" })
const host = hosts.resolve("docs.example.com", "example.com")
const surface: "site" | "docs" | undefined = "surface" in host ? host.surface : undefined
const unmapped: UnmappedHost | undefined = "surface" in host ? undefined : host
// @ts-expect-error Surface URLs accept only mapped surfaces.
hosts.url("https://example.com", "tenant")
void [module, options, surface, unmapped]
