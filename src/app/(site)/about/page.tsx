import type { Metadata } from 'next'
import Link from 'next/link'

import { JsonLd } from '@/components/seo/json-ld'
import { breadcrumbJsonLd } from '@/lib/seo/jsonld'
import { buildMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildMetadata({
  title: '关于',
  description:
    'DUMB SIGNAL 是一个专注音乐、动漫与电影评论的个人档案：不追逐即时结论，也不把审美简化成分数。',
  path: '/about',
  keywords: ['关于 DUMB SIGNAL', '乐评网站', '影评', '动漫评论'],
})

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[860px] px-5 py-16 md:px-8 md:py-24">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: '首页', path: '/' },
          { name: '关于', path: '/about' },
        ])}
      />

      <p className="text-[0.66rem] uppercase tracking-[0.26em] text-signal-dim">DUMB SIGNAL / ABOUT</p>

      <h1 className="mt-6 font-display text-4xl leading-tight text-white md:text-5xl">
        记录值得再次
        <br />
        播放与观看的作品。
      </h1>

      <p className="mt-6 max-w-2xl text-base leading-relaxed text-neutral-300">
        DUMB 是一个专注于音乐、动漫与电影评论的平台。我们从独立视角出发，留下作品与当下相遇时最真实的感受。
      </p>

      <section aria-label="DUMB 简介" className="mt-14 border-y border-signal-border py-10">
        <p className="text-[0.62rem] uppercase tracking-[0.24em] text-signal-dim">SIGNAL</p>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-signal-muted">
          不追逐即时结论，也不把审美简化成分数。这里收集声音、画面与叙事，让每一条更新成为通往作品本身的入口。
        </p>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl text-white">这里有什么</h2>
        <dl className="mt-6 divide-y divide-signal-border border-y border-signal-border">
          <div className="py-5">
            <dt className="text-sm text-white">音乐乐评</dt>
            <dd className="mt-1 text-sm leading-relaxed text-signal-muted">
              以专辑为单位，记录编曲、旋律与场景记忆。曲目表与主打曲来自官方数据源。
            </dd>
          </div>
          <div className="py-5">
            <dt className="text-sm text-white">动漫</dt>
            <dd className="mt-1 text-sm leading-relaxed text-signal-muted">
              关注叙事结构、演出与情绪落点，而不只是热度。
            </dd>
          </div>
          <div className="py-5">
            <dt className="text-sm text-white">电影</dt>
            <dd className="mt-1 text-sm leading-relaxed text-signal-muted">
              从作者电影到类型片，写观看之后仍然停留的部分。
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl text-white">技术与素材</h2>
        <p className="mt-4 text-sm leading-relaxed text-signal-muted">
          本站使用 Next.js 构建，内容以服务端渲染输出，图片资源来自各作品的公开资料与官方数据源。
          早期版本首页曾使用以下 3D 场景素材，现已移除，署名保留以示感谢：
        </p>
        <ul className="mt-5 space-y-4 text-sm">
          <li className="border border-signal-border p-4">
            <p className="text-white">Scifi Girl v.01 — by patrix</p>
            <p className="mt-1 text-xs text-signal-dim">首页人物模型（已移除）</p>
            <div className="mt-2 flex gap-4 text-[0.66rem] uppercase tracking-[0.14em]">
              <a
                href="https://sketchfab.com/3d-models/scifi-girl-v01-96340701c2ed4d37851c7d9109eee9c0"
                target="_blank"
                rel="noreferrer"
                className="text-signal-muted underline underline-offset-4 hover:text-white"
              >
                SOURCE ↗
              </a>
              <a
                href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                target="_blank"
                rel="noreferrer"
                className="text-signal-muted underline underline-offset-4 hover:text-white"
              >
                CC BY-NC-SA 4.0 ↗
              </a>
            </div>
          </li>
          <li className="border border-signal-border p-4">
            <p className="text-white">Modern VR Art Gallery Pyramid — by Maxim Mavrichev</p>
            <p className="mt-1 text-xs text-signal-dim">首页展馆场景（已移除）</p>
            <div className="mt-2 flex gap-4 text-[0.66rem] uppercase tracking-[0.14em]">
              <a
                href="https://sketchfab.com/3d-models/modern-vr-art-gallery-pyramid-c43438ef93dd406d93c3ade933e739ec"
                target="_blank"
                rel="noreferrer"
                className="text-signal-muted underline underline-offset-4 hover:text-white"
              >
                SOURCE ↗
              </a>
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
                className="text-signal-muted underline underline-offset-4 hover:text-white"
              >
                CC BY 4.0 ↗
              </a>
            </div>
          </li>
        </ul>
      </section>

      <p className="mt-16 text-sm">
        <Link href="/" className="text-signal-muted underline underline-offset-4 hover:text-white">
          ← 返回首页
        </Link>
      </p>
    </div>
  )
}
