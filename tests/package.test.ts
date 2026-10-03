import { $ } from "bun"
import { expect, test } from "bun:test"
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import module from "nuxt-surface"
import { defineSurfaceHosts } from "nuxt-surface/hosts"
import pkg from "nuxt-surface/package.json"

const root = resolve(import.meta.dir, "..")

test("public package exports", () => {
  expect(typeof module).toBe("function")
  expect(defineSurfaceHosts({ docs: "docs" }).getUrl("https://example.com", "docs")).toBe(
    "https://docs.example.com/",
  )
  expect(pkg.name).toBe("nuxt-surface")
})

test("built files import only peer packages and Node built-ins", async () => {
  const dist = join(root, "dist")
  const imported = new Set<string>()
  for (const file of await readdir(dist)) {
    const code = await readFile(join(dist, file), "utf8")
    for (const [, specifier] of code.matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)) {
      if (specifier!.startsWith(".") || specifier!.startsWith("node:")) continue
      imported.add(specifier!.split("/", specifier!.startsWith("@") ? 2 : 1).join("/"))
    }
  }
  expect([...imported].filter(name => !(name in pkg.peerDependencies))).toEqual([])
})

// npm skips optional peers, so a project without Nuxt installs this package alone.
test("hosts install and typecheck without Nuxt", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nuxt-surface-"))
  try {
    const cache = join(dir, "npm-cache")
    const [{ filename }] = await $`npm pack --json --pack-destination ${dir} --cache ${cache}`
      .cwd(root)
      .quiet()
      .json()
    const consumer = join(dir, "consumer")
    await mkdir(consumer)
    await writeFile(join(consumer, "package.json"), JSON.stringify({ private: true }))
    await $`npm install ${join(dir, filename)} --offline --cache ${cache} --no-audit --no-fund`
      .cwd(consumer)
      .quiet()
    const installed = await readdir(join(consumer, "node_modules"))
    expect(installed.filter(name => !name.startsWith("."))).toEqual(["nuxt-surface"])

    await writeFile(
      join(consumer, "index.mjs"),
      `import { defineSurfaceHosts } from "nuxt-surface/hosts"
console.log(defineSurfaceHosts({ docs: "docs" }).getHostname("example.com", "docs"))
`,
    )
    expect(await $`node index.mjs`.cwd(consumer).text()).toBe("docs.example.com\n")

    await writeFile(
      join(consumer, "index.ts"),
      `import { defineSurfaceHosts, type ResolvedHost } from "nuxt-surface/hosts"
const hosts = defineSurfaceHosts({ docs: "docs" })
export const host: ResolvedHost<"docs"> = hosts.resolve("docs.example.com", "example.com")
`,
    )
    await writeFile(
      join(consumer, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { module: "nodenext", strict: true, noEmit: true, types: [] },
        files: ["index.ts"],
      }),
    )
    await $`${join(root, "node_modules/.bin/tsc")} -p ${consumer}`.quiet()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}, 60_000)
