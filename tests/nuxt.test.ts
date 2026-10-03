import { describe, expect, test } from "bun:test"
import { unlink, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

import { createPage, fetch, getBrowser, setup, url } from "@nuxt/test-utils/e2e"
import { expect as browserExpect } from "@playwright/test"

const rootDir = resolve(import.meta.dir, "fixtures/app")
const spa = process.env.SURFACE_TEST_SPA === "true"
const dev = process.env.SURFACE_TEST_DEV === "true"

describe(`${dev ? "development" : spa ? "SPA" : "SSR"} surface module`, async () => {
  await setup({
    rootDir,
    buildDir: resolve(rootDir, ".nuxt"),
    runner: "bun",
    browser: true,
    dev,
    setupTimeout: 180_000,
  })

  test("overlapping roots and parallel HTML requests have independent surfaces", async () => {
    const ids = ["site", "docs", "tenant", "docs", "site", "tenant"]
    const responses = await Promise.all(
      ids.map(async id => {
        const response = await fetch("/", { headers: { cookie: `surface=${id}` } })
        return { status: response.status, html: await response.text(), id }
      }),
    )
    for (const { status, html, id } of responses) {
      expect(status).toBe(200)
      expect(html.includes(`${id}-home`)).toBe(!spa)
      if (!spa) {
        for (const other of ["site", "docs", "tenant"].filter(other => other !== id)) {
          expect(html).not.toContain(`${other}-home`)
        }
      }
    }
  })

  test("SSR and hydration agree, while SPA reads request context before initial routing", async () => {
    for (const id of ["site", "docs", "tenant"]) {
      const browser = await getBrowser()
      const context = await browser.newContext()
      await context.addCookies([{ name: "surface", value: id, url: url("/") }])
      const page = await context.newPage()
      const errors: string[] = []
      page.on("pageerror", error => errors.push(error.message))
      page.on("console", message => {
        if (/hydration/i.test(message.text())) errors.push(message.text())
      })
      try {
        await page.goto(url("/"))
        await page
          .locator('[data-hydrated="true"]')
          .waitFor({ timeout: 10_000 })
          .catch(error => {
            throw new Error(`Hydration did not complete. Browser errors: ${errors.join("; ")}`, {
              cause: error,
            })
          })
        expect(await page.locator("#page").textContent()).toBe(`${id}-home`)
        expect(await page.locator("#surface").textContent()).toBe(id)
        expect(
          await page.evaluate(
            () =>
              (document.querySelector("#__nuxt") as any).__vue_app__.$nuxt.payload.state
                .selectorCalls,
          ),
        ).toBe(1)
        expect(errors).toEqual([])
      } finally {
        await context.close()
      }
    }
  }, 30_000)

  test("direct nested, dynamic, catch-all and absolute routes preserve parents and metadata", async () => {
    for (const [path, content] of [
      ["/section/42", "site-guide-42"],
      ["/files/a/b", "site-files-a/b"],
      ["/public-absolute", "site-absolute"],
    ] as const) {
      const response = await fetch(path)
      expect(response.status).toBe(200)
      expect((await response.text()).includes(content)).toBe(!spa)
      const page = await createPage(path)
      try {
        expect(await page.locator("#page").textContent()).toBe(content)
        expect(await page.locator("#site-parent").count()).toBe(1)
        expect(await page.locator("#site-layout").count()).toBe(1)
        if (path.includes("42")) {
          expect(await page.locator("#section-parent").count()).toBe(1)
          const meta = await page.evaluate(() => {
            const app = (document.querySelector("#__nuxt") as any).__vue_app__.$nuxt
            return { ...app.$router.currentRoute.value.meta }
          })
          expect(meta).toMatchObject({
            parentMeta: "kept",
            sectionMeta: "kept",
            childMeta: "kept",
            middlewareRan: true,
          })
        }
      } finally {
        await page.close()
      }
    }
  }, 30_000)

  test("client navigation keeps the surface; a new document selects another one", async () => {
    const page = await createPage("/")
    try {
      await page.context().addCookies([{ name: "surface", value: "docs", url: url("/") }])
      await page.locator("#guide").click()
      await page.locator("#page").filter({ hasText: "site-guide-42" }).waitFor()
      expect(await page.locator("#surface").textContent()).toBe("site")
      expect(
        await page.evaluate(
          () =>
            (document.querySelector("#__nuxt") as any).__vue_app__.$nuxt.payload.state
              .selectorCalls,
        ),
      ).toBe(1)
      await page.locator("#switch-document").click()
      await page.locator("#page").filter({ hasText: "docs-home" }).waitFor()
      expect(await page.locator("#surface").textContent()).toBe("docs")
    } finally {
      await page.close()
    }
  })

  test("unknown surface fails closed; SPA HTML status was already sent", async () => {
    for (const id of ["missing", "undefined", "array"]) {
      const response = await fetch("/", { headers: { cookie: `surface=${id}` } })
      expect(response.status).toBe(spa ? 200 : 500)
      if (!spa) expect(await response.text()).not.toContain("site-home")
      const browser = await getBrowser()
      const context = await browser.newContext()
      await context.addCookies([{ name: "surface", value: id, url: url("/") }])
      const page = await context.newPage()
      const errors: string[] = []
      page.on("pageerror", error => errors.push(error.message))
      page.on("console", message => {
        if (message.type() === "error") errors.push(message.text())
      })
      try {
        await page.goto(url("/"))
        await browserExpect
          .poll(
            async () =>
              errors.join(" ") +
              (await page.evaluate(() => {
                const app = (document.querySelector("#__nuxt") as any)?.__vue_app__?.$nuxt
                return app?.payload.error?.message ?? document.body.textContent
              })),
          )
          .toContain("unknown surface ID")
        expect(await page.locator("#page").count()).toBe(0)
      } finally {
        await context.close()
      }
    }
  }, 30_000)

  test("route-rule redirects keep Nuxt's route record on surfaces that don't own their path", async () => {
    const page = await createPage("/")
    try {
      // Nuxt's route-rule middleware redirects even without a matching record, so check the record itself.
      const matched = await page.evaluate(
        () =>
          (document.querySelector("#__nuxt") as any).__vue_app__.$nuxt.$router.resolve("/old")
            .matched.length,
      )
      expect(matched).toBe(1)
      await page.evaluate(async () => {
        const app = (document.querySelector("#__nuxt") as any).__vue_app__.$nuxt
        await app.$router.push("/old")
      })
      await browserExpect(page.locator("#page")).toHaveText("site-guide-42")
      expect(new URL(page.url()).pathname).toBe("/section/42")
    } finally {
      await page.close()
    }
  }, 30_000)

  test("a document without a surface renders Nuxt's 404 page and keeps the selection through hydration", async () => {
    const response = await fetch("/", { headers: { cookie: "surface=none" } })
    expect(response.status).toBe(spa ? 200 : 404)
    const browser = await getBrowser()
    const context = await browser.newContext()
    await context.addCookies([{ name: "surface", value: "none", url: url("/") }])
    const page = await context.newPage()
    try {
      await page.goto(url("/"))
      await page.waitForFunction(() => (document.querySelector("#__nuxt") as any)?.__vue_app__)
      expect(await page.evaluate(() => document.body.textContent)).toContain("404")
      const state = await page.evaluate(() => ({
        ...(document.querySelector("#__nuxt") as any).__vue_app__.$nuxt.payload.state,
      }))
      expect(state).toMatchObject({ "nuxt-surface": null, selectorCalls: 1 })
      expect(await page.locator("#page").count()).toBe(0)
    } finally {
      await context.close()
    }
  })

  if (dev)
    test("Nuxt HMR reapplies the generated tree without reselecting the document surface", async () => {
      const file = resolve(rootDir, "app/pages/trees/site/hot.vue")
      const page = await createPage("/")
      const original = `<template>
  <p id="page">site-hot</p>
</template>
`
      try {
        await page.context().addCookies([{ name: "surface", value: "docs", url: url("/") }])
        await writeFile(file, original)
        await page.waitForFunction(() => {
          const app = (document.querySelector("#__nuxt") as any).__vue_app__.$nuxt
          return app.$router.hasRoute("trees-site-hot")
        })
        expect(await page.locator("#surface").textContent()).toBe("site")
        expect(
          await page.evaluate(
            () =>
              (document.querySelector("#__nuxt") as any).__vue_app__.$nuxt.payload.state
                .selectorCalls,
          ),
        ).toBe(1)
        await page.evaluate(async () => {
          const app = (document.querySelector("#__nuxt") as any).__vue_app__.$nuxt
          await app.$router.push("/hot")
        })
        await page.locator("#page").filter({ hasText: "site-hot" }).waitFor()
      } finally {
        await unlink(file).catch(() => {})
        await page.close()
      }
    }, 30_000)
})
