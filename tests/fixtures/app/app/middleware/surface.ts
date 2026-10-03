export default defineNuxtRouteMiddleware(to => {
  to.meta.middlewareRan = true
})
