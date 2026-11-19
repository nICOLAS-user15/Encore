import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement>

/** Surface block: slightly lighter background, thick straight border. */
export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-sm border-2 border-line bg-surface p-4', className)}
      {...props}
    />
  )
}
