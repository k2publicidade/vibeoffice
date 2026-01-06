"use client";

import { cn } from "@/lib/utils";
import { GradFlow } from 'gradflow';

// Want to create stunning backgrounds and play with the colors and values check: Check out https://gradflow.meera.dev/

interface StripeGradientShaderProps {
    className?: string;
}

export const StripeGradientShader = ({ className }: StripeGradientShaderProps) => {
    return (
        <div className={cn("relative h-full w-full overflow-hidden", className)}>
            <GradFlow config={{
                color1: { r: 238, g: 215, b: 207 },
                color2: { r: 250, g: 152, b: 133 },
                color3: { r: 255, g: 3, b: 0 },
                speed: 0.4,
                scale: 1,
                type: 'stripe',
                noise: 0.08
            }} />
        </div>
    );
};
