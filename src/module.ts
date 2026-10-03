import { resolve } from "node:path"

import { addImports, addTemplate, createResolver, defineNuxtModule, resolvePath } from "@nuxt/kit"

import type { ModuleOptions } from "./options"
import { validateSurfaces } from "./options"
import { validateSurfacePages } from "./routes"
import { clientTypesTemplate, surfacesTemplate } from "./templates"

const resolver = createResolver(import.meta.url)

/** Validate surface ownership at build time and provide runtime route selection. */
export default defineNuxtModule<ModuleOptions>({
  meta: { name: "nuxt-surface", configKey: "surface", compatibility: { nuxt: "^4.0.1" } },
  defaults: { surfaces: {} },
  async setup({ surfaces }, nuxt) {
    validateSurfaces(surfaces)
    // Nuxt's pages module imports this stub synchronously for route-rule redirects and its component-test route.
    const infrastructureComponent = await resolvePath(
      resolve(nuxt.options.appDir, "../pages/runtime/component-stub"),
    )

    addTemplate({
      filename: "surface/surfaces.mjs",
      write: true,
      getContents: () =>
        surfacesTemplate(surfaces, resolver.resolve("./routes.mjs"), infrastructureComponent),
    })
    addTemplate({
      filename: "surface/client.d.ts",
      write: true,
      getContents: () => clientTypesTemplate(Object.keys(surfaces)),
    })
    const client = addTemplate({
      filename: "surface/client.js",
      src: resolver.resolve("../templates/client.mjs"),
      write: true,
    })
    nuxt.options.alias["#nuxt-surface"] = client.dst
    addImports({ name: "useSurface", from: client.dst })

    // Nuxt skips pages:resolved without page metadata scanning; app.pages is the tree its routes come from.
    // Register after all modules so Nuxt's pages module fills it first; disabled pages fail as empty surfaces.
    nuxt.hook("modules:done", () => {
      nuxt.hook("app:templates", app => {
        // Runtime selection recognizes the same records by their synchronously imported component.
        const pages = (app.pages ?? []).filter(
          page => !(page._sync && page.file === infrastructureComponent),
        )
        validateSurfacePages(pages, surfaces)
      })
    })
  },
})
