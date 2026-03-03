import { cn } from "@/lib/utils";
import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
  glowColor?: string;
}

export function GlassCard({ className, children, glowColor, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl transition-all duration-500",
        "bg-card/80 backdrop-blur-xl",
        "border border-border/50",
        "hover:border-border hover:shadow-2xl",
        className
      )}
      {...props}
    >
      {/* Top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
      
      {/* Glow blob */}
      {glowColor && (
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-15 group-hover:opacity-25 transition-opacity duration-700 pointer-events-none"
          style={{ background: glowColor }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
