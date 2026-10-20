import { ContentForm } from '@/components/admin/content-form'

export default function NewReviewPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-white">新建乐评</h1>
      <p className="mt-1 text-sm text-signal-muted">填写专辑信息与正文，保存草稿或直接发布。</p>
      <div className="mt-8">
        <ContentForm kind="review" />
      </div>
    </div>
  )
}
