import { getCookie } from "h3"
import { defineRequestContextProvider } from "nuxt-request-context/provider"

export default defineRequestContextProvider(async event => {
  const surface = getCookie(event, "surface") ?? "site"
  // Overlap different request lifetimes to expose accidental shared selection state.
  await new Promise(resolve => setTimeout(resolve, surface === "site" ? 20 : 5))
  return { surface }
})
