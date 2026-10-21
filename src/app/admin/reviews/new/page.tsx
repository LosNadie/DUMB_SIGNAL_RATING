import { AdminPageHeader } from '@/components/admin/page-header'
import { ContentForm } from '@/components/admin/content-form'

export default function NewReviewPage() {
  return (
    <div>
      <AdminPageHeader title="新建乐评" description="填写专辑信息与正文，可保存草稿或直接发布。" />
      <ContentForm kind="review" />
    </div>
  )
}
