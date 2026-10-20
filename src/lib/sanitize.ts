import sanitizeHtml from 'sanitize-html'

/**
 * Allow-list for article bodies. Video embeds are limited to YouTube and
 * Bilibili player origins, which is what the legacy editor inserted.
 */
const ALLOWED_IFRAME_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'player.bilibili.com',
]

export const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'hr',
    'h2',
    'h3',
    'h4',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'del',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'img',
    'figure',
    'figcaption',
    'div',
    'span',
    'iframe',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    iframe: ['src', 'allow', 'allowfullscreen', 'frameborder', 'width', 'height', 'title'],
    div: ['class'],
    span: ['class'],
    '*': [],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: 'noopener noreferrer',
        ...(attribs.target === '_blank' ? { target: '_blank' } : {}),
      },
    }),
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: 'lazy' },
    }),
  },
  exclusiveFilter: (frame) => {
    if (frame.tag !== 'iframe') return false
    const src = frame.attribs.src ?? ''
    try {
      const url = new URL(src)
      return !ALLOWED_IFRAME_HOSTS.includes(url.hostname)
    } catch {
      return true
    }
  },
}

/** Clean stored HTML before rendering it with dangerouslySetInnerHTML. */
export function sanitizeContent(html: string | null | undefined): string {
  if (!html) return ''
  return sanitizeHtml(html, SANITIZE_OPTIONS)
}

/** Sanitize editor input before it is written to the database. */
export function sanitizeForStorage(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS)
}
