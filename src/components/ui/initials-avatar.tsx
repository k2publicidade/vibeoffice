'use client'

import { cn } from '@/lib/utils'

interface InitialsAvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

export function InitialsAvatar({ name, size = 'sm', className }: InitialsAvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-semibold text-white',
        'bg-gradient-to-br from-[#fe6e5b] to-[#ff0300]',
        'shadow-sm',
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  )
}
