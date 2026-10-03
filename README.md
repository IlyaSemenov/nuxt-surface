# nuxt-surface

Serve several sites from one Nuxt app, each with its own pages at the same URLs:

- `example.com/` → your landing page.
- `docs.example.com/` → documentation.
- `acme.example.com/` → Acme's workspace.
- `ideas.acme.org/` → the same workspace on its custom domain.
- `unknown.example.com/` → 404.

Nuxt's file router has one `pages/index.vue`, so `/` can only be one page.
With nuxt-surface, you put each site's pages in its own folder, and every page load picks one of these page sets, called surfaces, usually by hostname.
Components, layouts, plugins, server routes, and the deployment stay shared.
All customer workspaces share one surface; which customer it is stays in your own request data.

- Server rendering and hydration always agree on the surface, and concurrent requests don't affect each other's choice.
- Pages and components read the current surface with a typed `useSurface()`.
- The build checks that every page belongs to exactly one surface.
- `nuxt-surface/hosts` maps surfaces to subdomains and builds links between them.

Need separate modules, builds, or runtimes per site?
Use separate apps, for example with [`nuxt-multi-app`](https://www.npmjs.com/package/nuxt-multi-app).

Requires Nuxt 4 (4.0.1 or newer).

## Setup

```sh
npm install nuxt-surface
```

Put each site's pages under its own prefix and declare the prefixes as surfaces:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["nuxt-surface"],
  surface: {
    surfaces: {
      site: "/surfaces/site",
      docs: "/surfaces/docs",
      tenant: "/",
    },
  },
})
```

```text
app/pages/
├── index.vue                    # tenant: /
├── portal.vue                   # tenant: /portal
└── surfaces/
    ├── site/index.vue           # site: /
    ├── docs/index.vue           # docs: /
    └── docs/guide/[id].vue      # docs: /guide/:id
```

Pages outside the other prefixes belong to the surface declared as `/`.
Omit it if every page lives under a prefix.
Any static path without a trailing slash works as a prefix; `/surfaces` is just an example.

Pick the surface in `app/router.options.ts`.
A fixed ID is enough to try it:

```ts
// app/router.options.ts
import type { RouterConfig } from "@nuxt/schema"
import { selectSurfaceRoutes } from "#nuxt-surface"

export default {
  routes: routes => selectSurfaceRoutes(routes, () => "site"),
} satisfies RouterConfig
```

`selectSurfaceRoutes()` serves the selected surface's pages without its prefix, so `surfaces/docs/guide/[id].vue` answers at `/guide/42`.
Without this call, Nuxt serves all pages at their prefixed paths and `useSurface()` throws.

## Choosing by hostname

The selector runs once per page load, while Nuxt creates the router, so it can't use the route, the router, or `useSurface()`.
It must synchronously return a surface ID, or `null` to serve no pages, for example on an unknown customer host.
The data it needs has to be ready by then on both the server and the browser.

[`nuxt-request-context`](https://www.npmjs.com/package/nuxt-request-context) prepares such data per request, both with SSR and with `ssr: false`:

```sh
npm install nuxt-request-context
```

```ts
// nuxt.config.ts, alongside the surface configuration above
modules: [
  ["nuxt-request-context", { provider: "./server/request-context.ts" }],
  "nuxt-surface",
],
runtimeConfig: {
  public: {
    baseUrl: "https://example.com",
  },
},
```

`baseUrl` points to your main domain, also for requests to a customer's own domain.

`nuxt-surface/hosts` maps surfaces to subdomains of a base hostname.
It doesn't depend on Nuxt, so your app, Nitro, and server code outside Nuxt can share one map:

```ts
// shared/surface-hosts.ts
import { defineSurfaceHosts } from "nuxt-surface/hosts"

export const surfaceHosts = defineSurfaceHosts({
  site: null, // example.com
  docs: "docs", // docs.example.com
})
```

```ts
// server/request-context.ts
import { getRequestURL } from "h3"
import { defineRequestContextProvider } from "nuxt-request-context/provider"
import { surfaceHosts } from "#shared/surface-hosts"

export default defineRequestContextProvider(async event => {
  const baseHostname = new URL(useRuntimeConfig(event).public.baseUrl).hostname
  const host = surfaceHosts.resolve(getRequestURL(event).hostname, baseHostname)
  if ("surface" in host) return { surface: host.surface }
  // Other hosts are customer workspaces; findWorkspace() is your lookup by host.subdomain or host.domain.
  const workspace = await findWorkspace(host)
  return { surface: workspace ? ("tenant" as const) : null, workspace }
})
```

```ts
// app/router.options.ts
import type { RouterConfig } from "@nuxt/schema"
import { useRequestContext } from "#nuxt-request-context/client"
import { selectSurfaceRoutes } from "#nuxt-surface"

export default {
  routes: routes => selectSurfaceRoutes(routes, () => useRequestContext().surface),
} satisfies RouterConfig
```

`resolve()` returns `{ surface }` for a mapped host.
Other hosts are up to your app: a subdomain of the base hostname returns `{ subdomain }`, and any other hostname returns `{ domain }`.
Subdomains are case-insensitive.

When the selector returns `null`, the router has no routes and Nuxt renders its 404 page.
With SSR the response status is 404; with `ssr: false` the HTML comes with status 200 and the browser shows the 404 page.
Any other result, including `undefined` from missing data or a promise, throws.
On the server this fails the render; with `ssr: false` the error happens in the browser.

Links to another surface are full page loads.
`url()` builds them on the surface's host, keeping the protocol and port of the base URL:

```ts
const guideUrl = surfaceHosts.url(useRuntimeConfig().public.baseUrl, "docs", "/guide/42")
```

A `path` that points to another origin throws.
Links to a customer workspace are up to your app, since only it knows the workspace's domain.

Any other way to provide the data works too, as long as it is ready before Nuxt's router plugin on both the server and the browser.
A regular app plugin runs too late, and with `ssr: false` the data must arrive in the HTML.

## Reading the surface

```ts
const surface = useSurface()
```

`useSurface()` is auto-imported and also available from `#nuxt-surface`.
It returns one of the declared IDs, typed as `SurfaceId` after `nuxt prepare`, or `null` when the selector returned `null`.
Plugins, global middleware, and `error.vue` still run without a surface, so handle `null` there.

The surface stays the same for the whole page session, including client-side navigation and page HMR.
Hydration reuses the server's choice without calling the selector again.
To switch surfaces, load a new page with a regular link, `<NuxtLink external>`, or `location.assign()`.

## Pages

Only the top-level routes of the selected surface change: they lose the surface prefix.
Child routes, parent pages, layouts, middleware, page metadata, and route names stay as they are.
Route names keep the prefix, so named navigation uses `surfaces-docs-guide-id`.

- A parent page can't span surfaces.
  Give each surface its own parent page, such as `surfaces/docs.vue`, instead of one wrapper around all of them.
- Nested absolute paths, aliases, and redirects are used as written, so write them as public paths, such as `/guide/42`.
- If a page computes its `definePageMeta()` path, the build can't check it, and the page goes to the surface whose prefix matches its runtime path.
  With `experimental.scanPageMeta` disabled, this applies to every `definePageMeta()` path.

The build fails when a page belongs to no surface, a parent page spans surfaces, or a surface has no pages.
Redirects from `routeRules` work on every surface and don't count as its pages.

To change routes further, transform the selected array.
Route records are shared between server requests, so create new records instead of mutating them:

```ts
routes: (routes) => selectSurfaceRoutes(routes, () => useRequestContext().surface)
  .map((route) => ({ ...route, meta: { ...route.meta, appFlag: true } })),
```

## Limits

- Choosing a surface is not access control: the code of every surface ships in the same build.
- Nuxt features that read pages at build time, such as typed pages, inline route rules, and prerender route discovery, see the prefixed paths.
- Route rules don't know about surfaces, and a prerendered page keeps the surface its selector picked at build time.
- If you cache HTML or payloads, include the hostname, or whatever else picks the surface, in the cache key.
  Otherwise one site's pages are served on another.
