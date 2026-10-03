import { expect, test } from "bun:test"
import { resolve } from "node:path"

const rootDir = resolve(import.meta.dir, "fixtures/validation")

/** Run `nuxt prepare` on the fixture, whose only page is /site, with the given surfaces. */
async function prepare(surfaces: Record<string, string>) {
  const child = Bun.spawn(["nuxt", "prepare", rootDir], {
    env: { ...Bun.env, SURFACE_TEST_SURFACES: JSON.stringify(surfaces) },
    stdout: "pipe",
    stderr: "pipe",
  })
  const output =
    (await new Response(child.stdout).text()) + (await new Response(child.stderr).text())
  return { code: await child.exited, output }
}

test("build validation runs without page metadata scanning", async () => {
  const { code, output } = await prepare({ tenant: "/", empty: "/missing" })
  expect(code).not.toBe(0)
  expect(output).toContain("nuxt-surface: surface empty has no pages under /missing.")
}, 60_000)

test("route-rule redirects are not surface pages", async () => {
  const prefixed = await prepare({ site: "/site" })
  expect(prefixed.code, prefixed.output).toBe(0)
  const remainder = await prepare({ site: "/site", tenant: "/" })
  expect(remainder.code).not.toBe(0)
  expect(remainder.output).toContain("nuxt-surface: surface tenant has no pages under /.")
}, 60_000)
