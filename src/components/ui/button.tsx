import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from './cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs uppercase tracking-[0.18em] transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-white text-black hover:bg-neutral-300',
        outline:
          'border border-signal-border bg-transparent text-signal-fg hover:border-white hover:bg-white hover:text-black',
        ghost: 'bg-transparent text-signal-muted hover:text-white',
        danger: 'border border-red-900/70 text-red-300 hover:bg-red-950 hover:text-red-100',
        link: 'text-signal-fg underline underline-offset-4 decoration-neutral-700 hover:decoration-white',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-5',
        lg: 'h-12 px-7 text-sm',
        icon: 'size-9',
      },
      shape: {
        default: 'rounded-[2px]',
        pill: 'rounded-full',
        square: 'rounded-none',
      },
    },
    defaultVariants: { variant: 'default', size: 'md', shape: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, shape }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export { buttonVariants }
