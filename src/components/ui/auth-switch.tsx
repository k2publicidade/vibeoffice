'use client'

import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "./button";

interface AuthSwitchProps {
  className?: string;
}

/**
 * AuthSwitch Component
 * Um componente interativo para seleção de autenticação com contador
 * Usa as cores padrão do design system VIBE
 */
export const AuthSwitch = ({ className }: AuthSwitchProps) => {
  const [count, setCount] = useState(0);

  const decreaseCount = () => setCount((prev) => prev - 1);
  const increaseCount = () => setCount((prev) => prev + 1);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 p-6 rounded-lg",
        "bg-card border border-border",
        "shadow-card hover:shadow-card-hover transition-shadow",
        className
      )}
    >
      <h2 className="text-lg font-semibold text-foreground text-center">
        Tentativas de Acesso
      </h2>

      <div className="flex items-center justify-center gap-2">
        <span className="text-4xl font-bold text-primary">{count}</span>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={decreaseCount}
          className="w-12 h-12 p-0"
          aria-label="Diminuir contador"
        >
          −
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={increaseCount}
          className="w-12 h-12 p-0"
          aria-label="Aumentar contador"
        >
          +
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Rastreador interativo
      </p>
    </div>
  );
};

export default AuthSwitch;
