import { ContentForm } from '@/components/admin/content-form'

export default function NewAnimePage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-white">新建动漫</h1>
      <p className="mt-1 text-sm text-signal-muted">填写作品信息与正文。</p>
      <div className="mt-8">
        <ContentForm kind="anime" />
      </div>
    </div>
  )
}
