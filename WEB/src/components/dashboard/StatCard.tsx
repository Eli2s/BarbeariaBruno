
import { GlassCard } from "./GlassCard";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  glowColor: string;
  iconBg: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, subtitle, className, glowColor, iconBg }: StatCardProps) {
  return (
    <GlassCard
      className={cn("p-5 flex flex-col justify-between min-h-[130px] cursor-pointer", className)}
      glowColor={glowColor}
    >
      <div className="flex justify-between items-start">
        <div className={cn("p-2.5 rounded-xl flex items-center justify-center", iconBg)}>
          <Icon size={18} className="text-primary-foreground" />
        </div>
        {subtitle && (
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1">{subtitle}</span>
        )}
      </div>

      <div className="mt-auto pt-3">
        <h3 className="text-2xl font-extrabold tracking-tight text-foreground">{value}</h3>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">{title}</p>
      </div>
    </GlassCard>
  );
}
