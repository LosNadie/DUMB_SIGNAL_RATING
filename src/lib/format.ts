const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

function toBeijing(date: Date): Date {
  return new Date(date.getTime() + BEIJING_OFFSET_MS)
}

/** `2026-03-02 17:28` in Asia/Shanghai, independent of the server timezone. */
export function formatDateTime(date: Date): string {
  const value = toBeijing(date)
  const y = value.getUTCFullYear()
  const m = String(value.getUTCMonth() + 1).padStart(2, '0')
  const d = String(value.getUTCDate()).padStart(2, '0')
  const h = String(value.getUTCHours()).padStart(2, '0')
  const min = String(value.getUTCMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

/** `2026-03-02` in Asia/Shanghai. */
export function formatDate(date: Date): string {
  return formatDateTime(date).slice(0, 10)
}

export function formatYear(date: Date | null | undefined): string {
  if (!date) return '未知年份'
  return String(toBeijing(date).getUTCFullYear())
}

export function formatViews(views: number): string {
  if (views >= 10000) return `${(views / 10000).toFixed(1)} 万`
  return String(views)
}
