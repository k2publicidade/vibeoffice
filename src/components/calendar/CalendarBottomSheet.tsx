'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Task } from '@/types/tasks'
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal'
import { motion, AnimatePresence } from 'framer-motion'

interface CalendarFilter {
  id: string
  name: string
  color: string
  checked: boolean
  count?: number
}

interface CalendarBottomSheetProps {
  open: boolean
  onClose: () => void
  selectedDate: Date
  onDateSelect: (date: Date) => void
  filters: CalendarFilter[]
  onFilterChange: (id: string, checked: boolean) => void
  tasks?: Task[]
}

export function CalendarBottomSheet({
  open,
  onClose,
  selectedDate,
  onDateSelect,
  filters,
  onFilterChange,
  tasks = [],
}: CalendarBottomSheetProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate)
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const activeTask = tasks.length > 0 ? tasks[currentTaskIndex % tasks.length] : null

  const handleNextTask = () => {
    if (tasks.length === 0) return
    setCurrentTaskIndex((prev) => (prev + 1) % tasks.length)
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekDays = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const handleDateSelect = (day: Date) => {
    onDateSelect(day)
    // Opcional: fechar bottom sheet ao selecionar data
    // onClose()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent
          side="bottom"
          className="bg-black border-t border-[#262626] rounded-t-3xl max-h-[85vh] overflow-y-auto pb-safe"
        >
          {/* Custom Close Button - Bigger for touch */}
          <SheetClose className="absolute right-4 top-4 h-11 w-11 flex items-center justify-center rounded-xl bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#262626] transition-colors">
            <X className="h-5 w-5" />
          </SheetClose>

          {/* Drag Handle */}
          <div className="flex justify-center py-2 -mt-2">
            <div className="w-12 h-1.5 rounded-full bg-[#262626]" />
          </div>

          <SheetHeader className="px-4 pb-4">
            <SheetTitle className="text-white text-left text-lg">
              Calendário
            </SheetTitle>
          </SheetHeader>

          <div className="px-4 pb-8 space-y-6">
            {/* Mini Calendar */}
            <div className="rounded-2xl bg-[#1a1a1a] border border-[#262626] p-4">
              {/* Month Navigation */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-white capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-gray-400 hover:text-white hover:bg-[#262626] rounded-xl"
                    onClick={handlePrevMonth}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-gray-400 hover:text-white hover:bg-[#262626] rounded-xl"
                    onClick={handleNextMonth}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Week days header */}
              <div className="mb-2 grid grid-cols-7 text-center">
                {weekDays.map((day, index) => (
                  <div
                    key={index}
                    className="py-2 text-xs font-medium text-gray-500"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid - Bigger touch targets */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isSelected = isSameDay(day, selectedDate)
                  const isToday = isSameDay(day, new Date())

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateSelect(day)}
                      className={cn(
                        'flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 active:scale-95',
                        !isCurrentMonth && 'text-gray-600',
                        isCurrentMonth && 'text-white',
                        isSelected &&
                          'bg-gradient-to-br from-[#fc7a67] to-[#ff0300] text-white shadow-lg shadow-[#ff0300]/30',
                        !isSelected && isToday && 'ring-2 ring-[#fc7a67]',
                        !isSelected &&
                          isCurrentMonth &&
                          'hover:bg-[#262626] active:bg-[#333]'
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl bg-[#1a1a1a] border border-[#262626] p-4">
              <h3 className="mb-4 font-semibold text-white">Meus Calendários</h3>
              <div className="space-y-3">
                {filters.map((filter) => (
                  <label
                    key={filter.id}
                    className="flex items-center justify-between cursor-pointer group min-h-[44px] -mx-2 px-2 rounded-xl hover:bg-[#262626] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={filter.checked}
                        onCheckedChange={(checked) =>
                          onFilterChange(filter.id, checked as boolean)
                        }
                        className="h-6 w-6 border-[#404040] data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-[#fc7a67] data-[state=checked]:to-[#ff0300] data-[state=checked]:border-[#ff0300]"
                      />
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: filter.color }}
                      />
                      <span className="text-sm text-white">{filter.name}</span>
                    </div>
                    {filter.count !== undefined && (
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#262626] text-xs text-gray-400 font-medium">
                        {filter.count}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Active Task Card */}
            {activeTask && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTask.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl bg-gradient-to-br from-[#fc7a67] to-[#ff0300] p-4 text-white shadow-lg shadow-[#ff0300]/30"
                >
                  <div className="mb-3 flex items-center justify-between text-sm text-white/80">
                    {activeTask.dueDate ? (
                      <span>
                        {format(new Date(activeTask.dueDate), "dd 'de' MMMM", {
                          locale: ptBR,
                        })}
                      </span>
                    ) : (
                      <span>Sem data</span>
                    )}
                    <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">
                        {tasks.length > 1
                          ? `${(currentTaskIndex % tasks.length) + 1}/${tasks.length}`
                          : '1/1'}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-semibold text-white text-base line-clamp-2 min-h-[3rem]">
                    {activeTask.title}
                  </h4>

                  <div className="mt-4 flex gap-2">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="flex-1 h-12 rounded-xl bg-white/20 text-white border-0 hover:bg-white/30 font-medium"
                      onClick={handleNextTask}
                      disabled={tasks.length <= 1}
                    >
                      Depois
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="flex-1 h-12 rounded-xl bg-white text-[#ff0300] border-0 hover:bg-white/90 font-semibold"
                      onClick={() => setDetailsOpen(true)}
                    >
                      Detalhes
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Task Details Modal */}
      {activeTask && (
        <TaskDetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          task={activeTask}
        />
      )}
    </>
  )
}
