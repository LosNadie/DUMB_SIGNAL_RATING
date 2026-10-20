import Link from 'next/link'

import { deleteCommentAction } from '@/actions/comments'
import type { CommentTarget } from '@/lib/data/comments'
import type { CommentView } from '@/lib/data/comments'
import type { CurrentUser } from '@/types/auth'
import { formatDateTime } from '@/lib/format'

import { CommentForm } from './comment-form'

export function CommentSection({
  targetType,
  targetId,
  path,
  comments,
  user,
}: {
  targetType: CommentTarget
  targetId: number
  path: string
  comments: CommentView[]
  user: CurrentUser | null
}) {
  const total = comments.reduce((sum, comment) => sum + 1 + comment.replies.length, 0)
  const canModerate = user?.role === 'ADMIN' || user?.role === 'EDITOR'
  const ownTopLevel = user
    ? comments.find((comment) => comment.user.id === user.userId) ?? null
    : null

  return (
    <section id="comments" aria-labelledby="comments-heading" className="mt-16 border-t border-signal-border pt-10">
      <div className="flex items-baseline justify-between">
        <h2 id="comments-heading" className="text-[0.68rem] uppercase tracking-[0.24em] text-signal-muted">
          评论
        </h2>
        <span className="text-[0.68rem] tabular-nums text-signal-dim">{total}</span>
      </div>

      {user ? (
        <CommentForm
          targetType={targetType}
          targetId={targetId}
          path={path}
          existingContent={ownTopLevel?.content}
        />
      ) : (
        <p className="mt-6 border border-signal-border px-4 py-3 text-sm text-signal-muted">
          <Link href={`/login?next=${encodeURIComponent(path)}`} className="text-white underline underline-offset-4">
            登录
          </Link>{' '}
          后参与讨论。
        </p>
      )}

      {comments.length === 0 ? (
        <p className="mt-8 text-sm text-signal-dim">还没有评论，成为第一个发声的人。</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {comments.map((comment) => (
            <li key={comment.id}>
              <CommentItem
                comment={comment}
                canDelete={Boolean(user && (user.userId === comment.user.id || canModerate))}
                path={path}
              />
              {comment.replies.length > 0 && (
                <ul className="mt-4 space-y-4 border-l border-signal-border pl-5">
                  {comment.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentItem
                        comment={reply}
                        canDelete={Boolean(user && (user.userId === reply.user.id || canModerate))}
                        path={path}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CommentItem({
  comment,
  canDelete,
  path,
}: {
  comment: CommentView
  canDelete: boolean
  path: string
}) {
  return (
    <article>
      <div className="flex items-baseline gap-3">
        <span className="text-sm text-white">{comment.user.username}</span>
        <time dateTime={comment.createdAt.toISOString()} className="text-[0.66rem] text-signal-dim">
          {formatDateTime(comment.createdAt)}
        </time>
        {canDelete && (
          <form action={deleteCommentAction} className="ml-auto">
            <input type="hidden" name="id" value={comment.id} />
            <input type="hidden" name="path" value={path} />
            <button
              type="submit"
              className="text-[0.66rem] uppercase tracking-[0.14em] text-signal-dim transition-colors hover:text-red-400"
            >
              删除
            </button>
          </form>
        )}
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-signal-fg/80">
        {comment.content}
      </p>
    </article>
  )
}
