"use client";
import { Plane, PlaneLanding, PlaneTakeoff, Radio, Wind, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardsProps {
  radarCount: number;
  arrivalsCount: number;
  departuresCount: number;
  airportsCount: number;
  currentWind?: number;
  currentGusts?: number;
  selectedAirport?: string;
  isLoading?: boolean;
}

export function KPICards({
  radarCount, arrivalsCount, departuresCount, airportsCount,
  currentWind, currentGusts, selectedAirport, isLoading = false,
}: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KPI label="En Radar" value={radarCount} sub="Aproximando a bases"
        icon={<Plane className="h-5 w-5" />} color="blue" isLoading={isLoading} />
      <KPI label="Llegadas Prog." value={arrivalsCount} sub="Programadas"
        icon={<PlaneLanding className="h-5 w-5" />} color="green" isLoading={isLoading} />
      <KPI label="Salidas Prog." value={departuresCount} sub="Programadas"
        icon={<PlaneTakeoff className="h-5 w-5" />} color="amber" isLoading={isLoading} />
      {selectedAirport && currentWind !== undefined ? (
        <KPI label={`Viento en ${selectedAirport}`} value={currentWind} unit="kts"
          sub={`Ráfagas: ${currentGusts ?? 0} kts`}
          icon={<Wind className="h-5 w-5" />} color="red" isLoading={isLoading} alert={currentWind > 25} />
      ) : (
        <KPI label="Bases Monitorizadas" value={airportsCount} sub="Red completa activa"
          icon={<Radio className="h-5 w-5" />} color="purple" isLoading={isLoading} />
      )}
    </div>
  );
}

const colorMap: Record<string, { bar: string; icon: string; bg: string }> = {
  blue:   { bar: "bg-primary",  icon: "text-primary",  bg: "bg-primary/10"  },
  green:  { bar: "bg-chart-2",  icon: "text-chart-2",  bg: "bg-chart-2/10"  },
  amber:  { bar: "bg-chart-3",  icon: "text-chart-3",  bg: "bg-chart-3/10"  },
  red:    { bar: "bg-chart-4",  icon: "text-chart-4",  bg: "bg-chart-4/10"  },
  purple: { bar: "bg-chart-5",  icon: "text-chart-5",  bg: "bg-chart-5/10"  },
};

function KPI({
  label, value, unit, sub, icon, color, isLoading, alert,
}: {
  label: string; value: number; unit?: string; sub: string;
  icon: React.ReactNode; color: string; isLoading?: boolean; alert?: boolean;
}) {
  const c = colorMap[color];
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all duration-300",
      "hover:border-border",
      alert && "border-chart-4/40"
    )}>
      <div className={cn("absolute top-0 left-0 right-0 h-[2px]", c.bar)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-foreground/60 uppercase tracking-wider mb-2 truncate">
            {label}
          </p>
          {isLoading ? (
            <div className="h-9 w-20 bg-muted/60 animate-pulse rounded-md mb-1" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[32px] font-bold leading-none tracking-tight text-foreground tabular-nums">
                {value}
              </span>
              {unit && <span className="text-base font-normal text-foreground/70">{unit}</span>}
            </div>
          )}
          <p className="text-[12px] text-foreground/60 truncate mt-1.5">{sub}</p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", c.bg, c.icon)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
