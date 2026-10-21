import { AdminPageHeader } from '@/components/admin/page-header'
import { ContentForm } from '@/components/admin/content-form'

export default function NewAnimePage() {
  return (
    <div>
      <AdminPageHeader title="新建动漫" description="填写作品信息与正文，可保存草稿或直接发布。" />
      <ContentForm kind="anime" />
    </div>
  )
}
