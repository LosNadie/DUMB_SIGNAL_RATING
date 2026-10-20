import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-signal-border">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-8 text-xs text-signal-dim md:flex-row md:items-center md:justify-between md:px-8">
        <p className="tracking-[0.12em]">DUMB — Hear deeper, rate louder.</p>
        <nav aria-label="页脚导航" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about" className="transition-colors hover:text-white">
            关于
          </Link>
          <Link href="/music" className="transition-colors hover:text-white">
            音乐
          </Link>
          <Link href="/anime" className="transition-colors hover:text-white">
            动漫
          </Link>
          <Link href="/movie" className="transition-colors hover:text-white">
            电影
          </Link>
          <Link href="/sitemap.xml" className="transition-colors hover:text-white">
            Sitemap
          </Link>
        </nav>
      </div>
    </footer>
  )
}
