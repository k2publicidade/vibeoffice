"use client"

import React from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

interface NavItem {
    name: string
    url: string
    icon: LucideIcon
}

interface NavBarProps {
    items: NavItem[]
    className?: string
}

export function NavBar({ items, className }: NavBarProps) {
    const pathname = usePathname()
    const activeTab = items.find(item =>
        item.url === '/' ? pathname === '/' : pathname.startsWith(item.url)
    )?.name

    return (
        <nav aria-label="Navegação principal" className={cn("min-w-0", className)}>
            <div className="overflow-x-auto pt-2">
            <div className="flex w-max mx-auto items-center gap-1 bg-zinc-900/80 border border-zinc-800 backdrop-blur-lg py-1 px-1 rounded-full shadow-lg">
                {items.map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.name

                    return (
                        <Link
                            key={item.name}
                            href={item.url}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                "relative shrink-0 cursor-pointer text-sm font-semibold px-3 lg:px-4 py-2 rounded-full transition-colors",
                                "text-zinc-400 hover:text-white",
                                isActive && "bg-zinc-800 text-[#fc7a67]",
                            )}
                        >
                            <span className="hidden md:inline">{item.name}</span>
                            <span className="md:hidden">
                                <Icon size={18} strokeWidth={2.5} />
                            </span>
                            {isActive && (
                                <motion.div
                                    layoutId="lamp"
                                    className="absolute inset-0 w-full bg-[#fc7a67]/5 rounded-full -z-10"
                                    initial={false}
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 30,
                                    }}
                                >
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#fc7a67] rounded-t-full shadow-[0_0_10px_#fc7a67]">
                                        <div className="absolute w-12 h-6 bg-[#fc7a67]/20 rounded-full blur-md -top-2 -left-2" />
                                        <div className="absolute w-8 h-6 bg-[#fc7a67]/20 rounded-full blur-md -top-1" />
                                        <div className="absolute w-4 h-4 bg-[#fc7a67]/20 rounded-full blur-sm top-0 left-2" />
                                    </div>
                                </motion.div>
                            )}
                        </Link>
                    )
                })}
            </div>
            </div>
        </nav>
    )
}
