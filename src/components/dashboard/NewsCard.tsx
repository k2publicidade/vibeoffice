'use client'

import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface NewsCardProps {
  title: string
  description: string
  imageUrl?: string
  href?: string
}

export function NewsCard({ title, description, imageUrl, href }: NewsCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-zinc-800/50 border border-zinc-700/50 shadow-sm transition-all hover:bg-zinc-800/80 group flex flex-col">
      {/* Image with overlay */}
      <div className="relative h-44 w-full overflow-hidden border-b border-zinc-700/50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-700 to-zinc-900" />
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Logo in corner */}
        <div className="absolute bottom-4 right-4">
          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 opacity-80"
          >
            <path
              d="M8 8L20 32L26 20L32 32L32 8"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 text-zinc-100 group-hover:text-orange-400 transition-colors">
            {title}
          </h3>
          <p className="mt-2 text-sm text-zinc-400 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>
        {href && (
          <a
            href={href}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 hover:text-orange-300 transition-all group-hover:gap-2.5"
          >
            Ler mais
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        )}
      </div>
    </div>
  )
}
