"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface PremiumTimePickerProps {
    date?: Date
    onTimeChange: (date: Date) => void
    label?: string
    className?: string
}

export function PremiumTimePicker({
    date,
    onTimeChange,
    label,
    className,
}: PremiumTimePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)

    // Generate hours (00-23)
    const hours = Array.from({ length: 24 }, (_, i) => i)
    // Generate minutes (00-59)
    const minutes = Array.from({ length: 60 }, (_, i) => i)

    const selectedHour = date ? date.getHours() : 0
    const selectedMinute = date ? date.getMinutes() : 0

    const handleTimeChange = (type: "hour" | "minute", value: number) => {
        const newDate = new Date(date || new Date())
        if (type === "hour") {
            newDate.setHours(value)
        } else {
            newDate.setMinutes(value)
        }
        onTimeChange(newDate)
    }

    return (
        <div className={cn("grid gap-2", className)}>
            {label && (
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {label}
                </label>
            )}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "h-11 justify-start text-left font-normal rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white hover:border-[#fc7a67]/50 focus:border-[#fc7a67] focus:ring-[#fc7a67]/20 transition-all w-full",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <Clock className="mr-2 h-4 w-4 text-zinc-400 group-hover:text-[#fc7a67]" />
                        {date ? (
                            <span className="text-base">
                                {selectedHour.toString().padStart(2, "0")}:
                                {selectedMinute.toString().padStart(2, "0")}
                            </span>
                        ) : (
                            <span>Selecione a hora</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#0a0a0a] border-[#2a2a2a] shadow-2xl shadow-black/50" align="start">
                    <div className="flex h-[300px] w-[200px] divide-x divide-zinc-800">
                        {/* Hours Column */}
                        <ScrollArea className="flex-1 h-full">
                            <div className="p-2 space-y-1">
                                <div className="px-2 py-1 text-xs font-semibold text-zinc-500 text-center mb-1">
                                    Horas
                                </div>
                                {hours.map((hour) => (
                                    <Button
                                        key={hour}
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "w-full justify-center rounded-lg font-normal",
                                            selectedHour === hour
                                                ? "bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#fc7a67] hover:text-white"
                                                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                                        )}
                                        onClick={() => handleTimeChange("hour", hour)}
                                    >
                                        {hour.toString().padStart(2, "0")}
                                    </Button>
                                ))}
                            </div>
                            <ScrollBar orientation="vertical" className="w-0" />
                        </ScrollArea>

                        {/* Minutes Column */}
                        <ScrollArea className="flex-1 h-full">
                            <div className="p-2 space-y-1">
                                <div className="px-2 py-1 text-xs font-semibold text-zinc-500 text-center mb-1">
                                    Minutos
                                </div>
                                {minutes.map((minute) => (
                                    <Button
                                        key={minute}
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "w-full justify-center rounded-lg font-normal",
                                            selectedHour === minute // Bug in logic check? No, checking minute
                                                ? "" : "",
                                            selectedMinute === minute
                                                ? "bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#fc7a67] hover:text-white"
                                                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                                        )}
                                        onClick={() => handleTimeChange("minute", minute)}
                                    >
                                        {minute.toString().padStart(2, "0")}
                                    </Button>
                                ))}
                            </div>
                            <ScrollBar orientation="vertical" className="w-0" />
                        </ScrollArea>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
