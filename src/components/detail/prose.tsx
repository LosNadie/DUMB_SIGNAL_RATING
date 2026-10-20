import { sanitizeContent } from '@/lib/sanitize'

/**
 * Renders stored article HTML. Sanitization happens here as well as at write
 * time so content imported from the legacy database is also cleaned.
 */
export function Prose({ html, className = '' }: { html: string; className?: string }) {
  const clean = sanitizeContent(html)
  if (!clean) {
    return <p className="text-sm text-signal-dim">暂无正文。</p>
  }
  return <div className={`prose-signal ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />
}
