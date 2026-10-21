import { AdminPageHeader } from '@/components/admin/page-header'
import { ContentForm } from '@/components/admin/content-form'

export default function NewMoviePage() {
  return (
    <div>
      <AdminPageHeader title="新建电影" description="填写影片信息与正文，可保存草稿或直接发布。" />
      <ContentForm kind="movie" />
    </div>
  )
}
