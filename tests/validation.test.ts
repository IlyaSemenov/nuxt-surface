import { expect, test } from "bun:test"
import { resolve } from "node:path"

const rootDir = resolve(import.meta.dir, "fixtures/invalid")

test("build validation runs without page metadata scanning", async () => {
  const prepare = Bun.spawn(["nuxt", "prepare", rootDir], { stdout: "pipe", stderr: "pipe" })
  const output =
    (await new Response(prepare.stdout).text()) + (await new Response(prepare.stderr).text())
  expect(await prepare.exited).not.toBe(0)
  expect(output).toContain("nuxt-surface: surface empty has no pages under /missing.")
}, 60_000)
