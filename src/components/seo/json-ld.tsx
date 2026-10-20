import { serializeJsonLd } from '@/lib/seo/jsonld'

type JsonLdData = Record<string, unknown>

/** Render one or more JSON-LD documents. Content is escaped for `<`. */
export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  return (
    <script
      type="application/ld+json"
      // serializeJsonLd escapes `<` so stored content cannot break out.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
