import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-5 text-center">
      <p className="signal-logo text-5xl text-white">DUMB</p>
      <p className="mt-6 text-[0.68rem] uppercase tracking-[0.26em] text-signal-dim">Signal lost / 404</p>
      <h1 className="mt-3 font-display text-2xl text-white">这个页面不存在</h1>
      <p className="mt-2 max-w-sm text-sm text-signal-muted">
        链接可能已失效，或内容已被移除。
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="border border-white bg-white px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.2em] text-black transition-colors hover:bg-neutral-300"
        >
          返回首页
        </Link>
        <Link
          href="/search"
          className="border border-signal-border px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.2em] text-signal-muted transition-colors hover:border-white hover:text-white"
        >
          搜索
        </Link>
      </div>
    </div>
  )
}
