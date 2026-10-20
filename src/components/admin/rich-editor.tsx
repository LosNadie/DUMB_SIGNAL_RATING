'use client'

import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

import { cn } from '@/components/ui/cn'

export interface RichEditorProps {
  name: string
  value: string
  onChangeValue: (html: string) => void
  placeholder?: string
}

/**
 * TipTap-based body editor. Replaces the old contenteditable + execCommand
 * implementation. The HTML is sanitized again on the server before storage.
 */
export function RichEditor({ name, value, onChangeValue, placeholder }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer' },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: placeholder ?? '开始写作…' }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'prose-signal min-h-[320px] max-w-none px-4 py-3 focus:outline-none [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:text-signal-dim',
      },
    },
    onUpdate: ({ editor: instance }) => onChangeValue(instance.getHTML()),
    immediatelyRender: false,
  })

  // Keep the editor in sync when an AI draft replaces the body.
  useEffect(() => {
    if (!editor) return
    if (!editor.isFocused && editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) {
    return <div className="h-[360px] border border-signal-border bg-signal-panel" />
  }

  const addLink = () => {
    const url = window.prompt('链接地址')
    if (!url) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const addImage = () => {
    const url = window.prompt('图片地址')
    if (!url) return
    editor.chain().focus().setImage({ src: url.trim() }).run()
  }

  const addVideo = () => {
    const url = window.prompt('YouTube 或 B 站视频链接')
    if (!url) return
    const src = normalizeVideoUrl(url.trim())
    if (!src) return
    editor
      .chain()
      .focus()
      .insertContent(
        `<div class="video-block"><iframe src="${src}" frameborder="0" allowfullscreen loading="lazy"></iframe></div><p></p>`,
      )
      .run()
  }

  return (
    <div className="border border-signal-border bg-signal-panel focus-within:border-white/60">
      <div className="flex flex-wrap items-center gap-1 border-b border-signal-border px-2 py-1.5">
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label="B" />
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label="I" />
        <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="H2" />
        <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="H3" />
        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} label="•" />
        <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="1." />
        <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="❝" />
        <span className="mx-1 h-4 w-px bg-signal-border" />
        <ToolbarButton active={editor.isActive('link')} onClick={addLink} label="链接" />
        <ToolbarButton onClick={addImage} label="图片" />
        <ToolbarButton onClick={addVideo} label="视频" />
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} label="分隔" />
      </div>

      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={value} readOnly />
    </div>
  )
}

function ToolbarButton({
  active,
  onClick,
  label,
}: {
  active?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-w-7 px-2 py-1 text-[0.7rem] transition-colors',
        active ? 'bg-white text-black' : 'text-signal-muted hover:text-white',
      )}
    >
      {label}
    </button>
  )
}

export function normalizeVideoUrl(raw: string): string {
  if (!raw) return ''
  if (raw.includes('youtube.com/watch')) {
    const match = raw.match(/[?&]v=([^&]+)/)
    if (match?.[1]) return `https://www.youtube.com/embed/${match[1]}`
  }
  if (raw.includes('youtu.be/')) {
    const match = raw.match(/youtu\.be\/([^?&/]+)/)
    if (match?.[1]) return `https://www.youtube.com/embed/${match[1]}`
  }
  if (raw.includes('bilibili.com/video/')) {
    const match = raw.match(/\/video\/(BV[0-9A-Za-z]+)/)
    if (match?.[1]) return `https://player.bilibili.com/player.html?bvid=${match[1]}&page=1`
  }
  return raw
}
