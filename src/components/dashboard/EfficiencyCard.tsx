'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Activity, FolderKanban, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
  name: string;
  hours: number;
  color: string;
}

interface EfficiencyCardProps {
  efficiency?: number;
  hoursWorked?: number;
  totalHours?: number;
  activity?: number;
  projectCount?: number;
  projects?: Project[];
  period?: string;
  primaryMetricLabel?: string;
  activityLabel?: string;
  projectCountLabel?: string;
  projectValueSuffix?: string;
  completedDays?: boolean[];
}

export function EfficiencyCard({
  efficiency = 0,
  hoursWorked = 0,
  totalHours = 0,
  activity = 0,
  projectCount = 0,
  projects = [],
  period = 'Dados reais',
  primaryMetricLabel = 'Horas',
  activityLabel = 'Atividade',
  projectCountLabel = 'Projetos',
  projectValueSuffix = 'hr',
  completedDays = [false, false, false, false, false, false, false],
}: EfficiencyCardProps) {
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="rounded-3xl bg-[#1a1a1a] border border-zinc-800 p-6 h-full transition-all hover:bg-[#1f1f1f] shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-white text-xl font-bold">Eficiência</h3>
        <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
          {period}
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 lg:gap-8 items-start">
        {/* Left Section: Stats and Weekly Progress */}
        <div className="flex-1 space-y-6 md:space-y-8 w-full">
          <div className="flex items-center gap-2">
            <span className="text-6xl font-black text-white leading-none tracking-tighter">{efficiency}%</span>
            <ChevronDown className="h-8 w-8 text-white/50" />
          </div>

          {/* Week Days Progress Indicators */}
          <div className="flex gap-2.5">
            {weekDays.map((day, index) => (
              <div key={index} className="flex flex-col items-center gap-3 group">
                <div
                  className={cn(
                    "w-10 h-2.5 rounded-full transition-all duration-300",
                    completedDays[index]
                      ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                      : "bg-[#2a2a2a]"
                  )}
                />
                <span className={cn(
                  "text-xs font-bold transition-colors",
                  completedDays[index] ? "text-white" : "text-gray-600"
                )}>
                  {day}
                </span>
              </div>
            ))}
          </div>

          {/* Stats Summary Rows */}
          <div className="grid grid-cols-3 gap-6 pt-2">
            <div className="space-y-1">
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-black text-white">{hoursWorked}</span>
                <span className="text-xl font-medium text-gray-600">/{totalHours}</span>
              </div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{primaryMetricLabel}</p>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-white">{activity}%</div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{activityLabel}</p>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-white">{projectCount}</div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{projectCountLabel}</p>
            </div>
          </div>

          {/* Project List */}
          <div className="space-y-4 pt-4 border-t border-zinc-800/50">
            {projects.map((project, index) => (
              <div key={index} className="group cursor-default">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full shadow-sm"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="text-gray-400 group-hover:text-white transition-colors text-sm font-semibold">{project.name}</span>
                  </div>
                  <span className="text-white font-black text-sm">{project.hours} {projectValueSuffix}</span>
                </div>
                {/* Horizontal Progress Bar */}
                {/* 
                  Instead of shadcn progress, using a custom one to perfectly match the design 
                  which is very minimal (h-1.5, dark bg, colored foreground)
                */}
                <div className="h-1.5 bg-[#121212] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${totalHours > 0 ? (project.hours / totalHours) * 100 : 0}%`,
                      backgroundColor: project.color,
                      boxShadow: `0 0 10px ${project.color}40`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Section: Circular Gauge (Donut Chart) */}
        <div className="flex shrink-0 items-center justify-center pt-4 lg:pt-0 mx-auto lg:mx-0 w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48">
          <div className="relative w-full h-full group">
            {/* Glow background effect */}
            <div className="absolute inset-4 rounded-full bg-orange-500/5 blur-3xl group-hover:bg-orange-500/10 transition-all duration-500" />

            <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r="72"
                stroke="#121212"
                strokeWidth="16" // Thinner for a more modern look
                fill="none"
              />

              {/* Segments - Rendering them as a single stroke with colored segments would be complex 
                  so we follow the design provided (the image shows a multi-colored donut)
              */}

              {/* Base gradient segment (Marketing + Others) */}
              <circle
                cx="96"
                cy="96"
                r="72"
                stroke="#fc7a67"
                strokeWidth="16"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 72}`}
                strokeDashoffset={`${2 * Math.PI * 72 * (1 - ((projects[0]?.hours ?? 0) / Math.max(totalHours, 1)))}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-in-out"
              />

              {/* Overlapping segments could be added here for a true multi-color donut */}
            </svg>

            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-4xl font-black text-white leading-none">{hoursWorked}</span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{primaryMetricLabel}</span>
              <div className="w-8 h-1 bg-[#2a2a2a] rounded-full mt-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
