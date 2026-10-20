import { ContentForm } from '@/components/admin/content-form'

export default function NewMoviePage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-white">新建电影</h1>
      <p className="mt-1 text-sm text-signal-muted">填写影片信息与正文。</p>
      <div className="mt-8">
        <ContentForm kind="movie" />
      </div>
    </div>
  )
}
