'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { submitCommentAction, type CommentActionState } from '@/actions/comments'
import { Button } from '@/components/ui/button'
import type { CommentTarget } from '@/lib/data/comments'

const initialState: CommentActionState = {}

export function CommentForm({
  targetType,
  targetId,
  path,
  existingContent,
}: {
  targetType: CommentTarget
  targetId: number
  path: string
  existingContent?: string
}) {
  const [state, action, pending] = useActionState(submitCommentAction, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) {
      toast.success(state.updated ? '评论已更新' : '评论已发布')
      if (!state.updated) formRef.current?.reset()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form ref={formRef} action={action} className="mt-6">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="path" value={path} />

      <label htmlFor="comment-content" className="sr-only">
        评论内容
      </label>
      <textarea
        id="comment-content"
        name="content"
        defaultValue={existingContent}
        rows={3}
        maxLength={2000}
        placeholder={existingContent ? '你已发表过评论，修改后会覆盖原内容。' : '写下你的听感或想法…'}
        className="w-full resize-y border border-signal-border bg-signal-panel px-3 py-2.5 text-sm leading-relaxed text-white placeholder:text-signal-dim focus:border-white focus:outline-none"
      />

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[0.66rem] text-signal-dim">
          {existingContent ? '同一内容下你只有一条顶层评论' : '最多 2000 字'}
        </span>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? '提交中…' : existingContent ? '更新评论' : '发表评论'}
        </Button>
      </div>
    </form>
  )
}
