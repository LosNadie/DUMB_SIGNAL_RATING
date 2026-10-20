import * as React from 'react'

import { cn } from './cn'

const fieldBase =
  'w-full rounded-[2px] border border-signal-border bg-signal-panel px-3 text-sm text-signal-fg placeholder:text-signal-dim transition-colors hover:border-neutral-600 focus:border-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={cn(fieldBase, 'h-10', className)} {...props} />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn(fieldBase, 'py-2 leading-relaxed', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(fieldBase, 'h-10 appearance-none pr-8', className)} {...props}>
    {children}
  </select>
))
Select.displayName = 'Select'

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1.5 block text-[0.7rem] uppercase tracking-[0.18em] text-signal-muted', className)}
      {...props}
    />
  )
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return <p className="mt-1.5 text-xs text-red-400">{children}</p>
}
