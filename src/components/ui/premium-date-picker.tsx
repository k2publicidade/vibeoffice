"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface PremiumDatePickerProps {
    date?: Date
    onDateChange: (date: Date | undefined) => void
    placeholder?: string
    className?: string
    label?: string
}

export function PremiumDatePicker({
    date,
    onDateChange,
    placeholder = "Selecione uma data",
    className,
    label,
}: PremiumDatePickerProps) {
    return (
        <div className={cn("grid gap-2", className)}>
            {label && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "h-11 justify-start text-left font-normal rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white hover:border-[#fc7a67]/50 focus:border-[#fc7a67] focus:ring-[#fc7a67]/20 transition-all w-full",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 text-zinc-400 group-hover:text-[#fc7a67]" />
                        {date ? (
                            format(date, "PPP", { locale: ptBR })
                        ) : (
                            <span>{placeholder}</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#0a0a0a] border-[#2a2a2a] shadow-2xl shadow-black/50" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={onDateChange}
                        initialFocus
                        locale={ptBR}
                        className="p-3"
                        classNames={{
                            day_selected: "bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#cc0200] focus:from-[#ff0300] focus:to-[#cc0200]",
                            day_today: "bg-zinc-800 text-white",
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
