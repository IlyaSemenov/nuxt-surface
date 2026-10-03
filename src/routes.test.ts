import { describe, expect, test } from "bun:test"

import { createMemoryHistory, createRouter, type RouteRecordRaw } from "vue-router"

import { validateSurfaces } from "./options"
import { selectRoutes, validateSurfacePages } from "./routes"

const component = { template: "<div />" }

describe("surface routes", () => {
  const surfaces = { site: "/trees/site", docs: "/trees/docs", tenant: "/" }
  const routes: RouteRecordRaw[] = [
    {
      path: "/trees/site",
      component,
      meta: { layout: "site" },
      children: [
        { path: "", name: "trees-site", component },
        { path: "guide/:id", name: "trees-site-guide-id", component },
        { path: "/public", name: "trees-site-public", component },
      ],
    },
    { path: "/trees/docs", name: "trees-docs", component },
    { path: "/trees/docs/topic", name: "trees-docs-topic", component },
    { path: "/", name: "index", component },
    { path: "/trees/site-other", name: "site-other", component },
  ]

  function router(id: string) {
    return createRouter({
      history: createMemoryHistory(),
      routes: selectRoutes(routes, surfaces, id),
    })
  }

  test("the page tree passes build validation", () => {
    expect(() => validateSurfacePages(routes, surfaces)).not.toThrow()
  })

  test("prefixed roots move to public paths with their children", () => {
    const site = router("site")
    expect(site.resolve("/").name).toBe("trees-site")
    expect(site.resolve("/guide/42").matched.map(route => route.path)).toEqual(["/", "/guide/:id"])
    expect(site.resolve("/guide/42").meta).toEqual({ layout: "site" })
    expect(site.resolve("/public").name).toBe("trees-site-public")
    expect(site.hasRoute("index")).toBe(false)
    expect(router("docs").resolve("/topic").name).toBe("trees-docs-topic")
  })

  test("the / surface keeps the remaining routes unchanged", () => {
    const tenant = router("tenant")
    expect(tenant.resolve("/").name).toBe("index")
    expect(tenant.resolve("/trees/site-other").name).toBe("site-other")
    expect(tenant.hasRoute("trees-site")).toBe(false)
  })

  test("shared route records are not mutated", () => {
    selectRoutes(routes, surfaces, "site")
    expect(routes[0]!.path).toBe("/trees/site")
  })
})

test("build validation rejects unowned pages, parents spanning surfaces and empty surfaces", () => {
  expect(() => validateSurfacePages([{ path: "/extra" }], { site: "/site" })).toThrow(
    "outside every surface prefix",
  )
  expect(() =>
    validateSurfacePages([{ path: "/", children: [{ path: "docs" }] }], {
      tenant: "/",
      docs: "/docs",
    }),
  ).toThrow("cannot span surfaces")
  expect(() => validateSurfacePages([{ path: "/site" }], { site: "/site", docs: "/docs" })).toThrow(
    "docs has no pages",
  )
})

test("configuration rejects empty and overlapping surfaces", () => {
  const invalid: Record<string, string>[] = [
    {},
    { a: "/docs", b: "/docs" },
    { a: "/docs", b: "/docs/deep" },
  ]
  for (const config of invalid) {
    expect(() => validateSurfaces(config)).toThrow("nuxt-surface:")
  }
  expect(() => validateSurfaces({ site: "/site", tenant: "/" })).not.toThrow()
})

test("configuration requires nonempty IDs and static absolute prefixes", () => {
  expect(() => validateSurfaces({ "": "/site" })).toThrow("IDs must not be empty")
  for (const prefix of ["site", "", "/site/", "/site//docs", "/site/:lang", "/site/*", "/site?"]) {
    expect(() => validateSurfaces({ site: prefix })).toThrow(
      "prefix must be a static absolute path",
    )
  }
  expect(() => validateSurfaces({ site: "/my-site/v1.0", tenant: "/" })).not.toThrow()
})

test("known infrastructure routes stay unchanged on every surface", () => {
  const stub = { template: "<div />" }
  const shared = { path: "/old", component: stub }
  const prefixed = { path: "/site/old", component: stub }
  const routes = [shared, prefixed, { path: "/site", component }, { path: "/docs", component }]
  for (const id of ["site", "docs"]) {
    const selected = selectRoutes(routes, { site: "/site", docs: "/docs" }, id, stub)
    expect(selected.map(route => route.path)).toEqual(["/old", "/site/old", "/"])
    expect(selected[0]).toBe(shared)
    expect(selected[1]).toBe(prefixed)
  }
})

test("page aliases and redirects remain public paths", async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: selectRoutes<RouteRecordRaw>(
      [
        { path: "/site/guide", component, alias: "/manual" },
        { path: "/site/old", redirect: "/guide" },
      ],
      { site: "/site" },
      "site",
    ),
  })
  expect(router.resolve("/manual").matched[0]!.aliasOf?.path).toBe("/guide")
  await router.push("/old")
  expect(router.currentRoute.value.path).toBe("/guide")
})
