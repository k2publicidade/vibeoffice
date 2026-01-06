"use client";

import { cn } from "@/lib/utils";

interface RadialGlowBackgroundProps {
    className?: string;
    glowColor?: string;
    glowSize?: string;
    glowTop?: string;
}

export const RadialGlowBackground = ({
    className,
    glowColor = "rgba(249, 115, 22, 0.4)",
    glowSize = "500px",
    glowTop = "0px",
}: RadialGlowBackgroundProps) => {
    return (
        <div
            className={cn("absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[inherit]", className)}
            style={{
                backgroundImage: `radial-gradient(circle ${glowSize} at 50% ${glowTop}, ${glowColor}, transparent)`,
            }}
        />
    );
};
