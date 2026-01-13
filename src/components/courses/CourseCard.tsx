'use client'

import React from 'react';
import type { Course } from '@/types/courses'
import { BookOpen, Clock, User, PlayCircle, Trophy, BarChart } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CourseCardProps {
  course: Course
  progress?: number
  onClick?: () => void
}

const difficultyConfig = {
  beginner: { label: 'Iniciante', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  intermediate: { label: 'Intermediário', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  advanced: { label: 'Avançado', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
}

export function CourseCard({ course, progress = 0, onClick }: CourseCardProps) {
  const difficulty = course.difficulty || 'beginner'
  const config = difficultyConfig[difficulty]
  const isCompleted = progress === 100

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.01 }}
      className="group cursor-pointer relative flex flex-col h-full bg-neutral-900/60 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 hover:shadow-[0_0_30px_-10px_rgba(255,255,255,0.05)] transition-all duration-300"
      onClick={onClick}
    >
      {/* Thumbnail Area */}
      <div className="relative h-48 w-full overflow-hidden bg-white/5">
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-black flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-white/5 group-hover:text-white/10 transition-colors" />
          </div>
        )}

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent opacity-90" />

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
            <PlayCircle className="w-8 h-8 text-white fill-white/20" />
          </div>
        </div>

        {/* Floating Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={cn("px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider backdrop-blur-md border", config.bg, config.color, config.border)}>
            {config.label}
          </span>
        </div>

        {isCompleted && (
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Trophy size={14} className="text-black fill-black" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex-1 mb-4 space-y-2">
          <h3 className="text-xl font-bold text-white leading-tight group-hover:text-red-500 transition-colors line-clamp-2">
            {course.title}
          </h3>
          <p className="text-sm text-zinc-400 line-clamp-2 font-medium">
            {course.description}
          </p>
        </div>

        {/* Meta Data */}
        <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium mb-4">
          <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
            <User size={12} className="text-zinc-400" />
            <span>{course.instructor || 'Vibe Team'}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
            <Clock size={12} className="text-zinc-400" />
            <span>{course.duration ? `${Math.round(course.duration / 60)}h ${course.duration % 60}m` : '0h 0m'}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-4 border-t border-white/5">
          <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold">
            <span className={progress > 0 ? "text-zinc-200" : "text-zinc-600"}>
              {progress === 100 ? 'Concluído' : progress > 0 ? 'Em andamento' : 'Não iniciado'}
            </span>
            <span className="text-red-500">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={cn("h-full rounded-full", isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-red-600 to-orange-500")}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
