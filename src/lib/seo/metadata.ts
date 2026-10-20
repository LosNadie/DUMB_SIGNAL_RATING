import type { Metadata } from 'next'

import { siteUrl } from '@/lib/env'
import { absoluteUrl, resolveImageUrl } from '@/lib/images'

export const SITE_NAME = 'DUMB SIGNAL'
export const SITE_TAGLINE = '乐评、动漫与电影的信号档案'
export const SITE_DESCRIPTION =
  'DUMB SIGNAL 是一个极简暗黑风格的影音内容社区：专辑乐评、动漫与电影，听见更深，评分更响。'

export interface BuildMetadataInput {
  title: string
  description?: string | null
  path: string
  image?: string | null
  type?: 'website' | 'article'
  publishedTime?: Date | null
  modifiedTime?: Date | null
  noindex?: boolean
  keywords?: string[]
}

export function buildMetadata({
  title,
  description,
  path,
  image,
  type = 'website',
  publishedTime,
  modifiedTime,
  noindex = false,
  keywords,
}: BuildMetadataInput): Metadata {
  const canonical = absoluteUrl(path, siteUrl)
  const ogImage = absoluteUrl(resolveImageUrl(image), siteUrl)
  const desc = description?.trim() || SITE_DESCRIPTION

  return {
    title,
    description: desc,
    keywords,
    alternates: { canonical },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type,
      title,
      description: desc,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'zh_CN',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(publishedTime ? { publishedTime: publishedTime.toISOString() } : {}),
      ...(modifiedTime ? { modifiedTime: modifiedTime.toISOString() } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImage],
    },
  }
}

/** Title used inside `<title>` — the root layout adds the site suffix. */
export function contentTitle(primary: string, secondary?: string | null): string {
  return secondary ? `${primary} - ${secondary}` : primary
}
