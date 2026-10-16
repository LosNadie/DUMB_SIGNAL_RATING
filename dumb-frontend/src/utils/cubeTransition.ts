const CUBE_NAV_KEY = 'dumb_cube_nav_payload'
const CUBE_NAV_VALID_MS = 2800

interface CubeNavPayload {
  route: string
  time: number
}

export function consumeCubeNavigation(route: string) {
  const raw = sessionStorage.getItem(CUBE_NAV_KEY)
  if (!raw) return false

  try {
    const payload = JSON.parse(raw) as CubeNavPayload
    const isSameRoute = payload.route === route
    const isInWindow = Date.now() - payload.time <= CUBE_NAV_VALID_MS
    sessionStorage.removeItem(CUBE_NAV_KEY)
    return isSameRoute && isInWindow
  } catch {
    sessionStorage.removeItem(CUBE_NAV_KEY)
    return false
  }
}
