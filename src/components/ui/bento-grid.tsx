"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { CardSpotlight } from "@/components/ui/card-spotlight";

export interface BentoItem {
    id?: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    status?: string;
    tags?: string[];
    meta?: string;
    cta?: string;
    colSpan?: number;
    hasPersistentHover?: boolean;
    onClick?: () => void;
}

interface BentoGridProps {
    items: BentoItem[];
}

function BentoGrid({ items }: BentoGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 max-w-7xl mx-auto">
            {items.map((item, index) => (
                <CardSpotlight
                    key={item.id || index}
                    onClick={item.onClick}
                    radius={220}
                    color="#1a1a1a"
                    className={cn(
                        "p-6 rounded-xl cursor-pointer transition-all duration-300",
                        "border border-zinc-800 bg-black/40 backdrop-blur-sm",
                        item.colSpan === 2 ? "md:col-span-2" : "col-span-1"
                    )}
                >
                    <div className="relative flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900/50 border border-zinc-800 group-hover/spotlight:border-zinc-700 transition-colors">
                                {item.icon}
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-medium px-2.5 py-1 rounded-full",
                                    "bg-zinc-900/50 text-zinc-400 border border-zinc-800",
                                    "group-hover/spotlight:text-zinc-200 transition-colors"
                                )}
                            >
                                {item.status || "Active"}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-semibold text-zinc-100 tracking-tight text-base">
                                {item.title}
                                <span className="ml-2 text-xs text-zinc-500 font-normal">
                                    {item.meta}
                                </span>
                            </h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                {item.description}
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center space-x-2">
                                {item.tags?.map((tag, i) => (
                                    <span
                                        key={i}
                                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-900/50 text-zinc-500 border border-zinc-800 group-hover/spotlight:border-zinc-700 group-hover/spotlight:text-zinc-400 transition-colors"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                            <span className="text-xs text-zinc-500 font-medium opacity-0 group-hover/spotlight:opacity-100 translate-x-2 group-hover/spotlight:translate-x-0 transition-all">
                                {item.cta || "Ver detalhes →"}
                            </span>
                        </div>
                    </div>
                </CardSpotlight>
            ))}
        </div>
    );
}

export { BentoGrid }
