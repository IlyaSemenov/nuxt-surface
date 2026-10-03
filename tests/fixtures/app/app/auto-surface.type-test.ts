const id: "site" | "docs" | "tenant" | null = useSurface()
// @ts-expect-error Auto-imported useSurface returns the generated ID union or null.
const missing: "missing" | null = useSurface()
void [id, missing]
export {}
