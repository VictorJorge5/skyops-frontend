"use client";
import { useState, useRef, useEffect } from "react";
import { RefreshCw, Plane, MapPin, Hash, Clock, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AIRPORTS, type AirportCode, type RiskLevel } from "@/lib/mock-data";

interface Props {
  selectedAirport: string; onAirportChange: (v: string) => void;
  forecastHours: number; onForecastHoursChange: (v: number) => void;
  riskFilters: RiskLevel[]; onRiskFilterChange: (f: RiskLevel[]) => void;
  airlines: string[]; selectedAirlines: string[]; onAirlinesChange: (a: string[]) => void;
  flightNumbers: string[]; selectedFlightNumbers: string[]; onFlightNumbersChange: (n: string[]) => void;
  onRefresh: () => void; isRefreshing?: boolean;
}

export function SidebarFilters({
  selectedAirport, onAirportChange,
  forecastHours, onForecastHoursChange,
  riskFilters, onRiskFilterChange,
  airlines, selectedAirlines, onAirlinesChange,
  flightNumbers, selectedFlightNumbers, onFlightNumbersChange,
  onRefresh, isRefreshing = false,
}: Props) {
  const [alSearch, setAlSearch] = useState("");
  const [flSearch, setFlSearch] = useState("");
  const [alOpen, setAlOpen] = useState(false);
  const [flOpen, setFlOpen] = useState(false);
  const alRef = useRef<HTMLDivElement>(null);
  const flRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (alRef.current && !alRef.current.contains(e.target as Node)) setAlOpen(false);
      if (flRef.current && !flRef.current.contains(e.target as Node)) setFlOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggleRisk = (r: RiskLevel) =>
    onRiskFilterChange(riskFilters.includes(r) ? riskFilters.filter((x) => x !== r) : [...riskFilters, r]);

  const filteredAl = airlines.filter(
    (a) => a.toLowerCase().includes(alSearch.toLowerCase()) && !selectedAirlines.includes(a)
  );
  const filteredFl = flightNumbers.filter(
    (f) => f.toLowerCase().includes(flSearch.toLowerCase()) && !selectedFlightNumbers.includes(f)
  );

  const risks: [RiskLevel, string, string][] = [
    ["LOW",    "Probabilidad BAJA",  "bg-chart-2"],
    ["MEDIUM", "Probabilidad MEDIA", "bg-chart-3"],
    ["HIGH",   "Probabilidad ALTA",  "bg-chart-4"],
  ];

  return (
    <aside className="w-[240px] min-w-[240px] border-r border-border/60 bg-sidebar flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 border border-primary/20">
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-foreground leading-tight">SkyOps AI</p>
            <p className="text-[12px] text-foreground/60">Centro de Control</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-4 space-y-5">

        {/* Aeropuerto */}
        <Section icon={<MapPin className="h-4 w-4" />} label="Aeropuerto">
          <Select value={selectedAirport} onValueChange={(v) => onAirportChange(v ?? "ALL")}>
            <SelectTrigger className="h-9 text-[13px] w-full text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-[13px]">Todos los Aeropuertos</SelectItem>
              {(Object.keys(AIRPORTS) as AirportCode[]).map((c) => (
                <SelectItem key={c} value={c} className="text-[13px]">
                  <span className="font-mono font-semibold">{c}</span>
                  <span className="text-foreground/60 ml-1.5 text-[12px]">
                    {AIRPORTS[c].name.split(" ").slice(0, 2).join(" ")}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>

        {/* Previsión */}
        <Section icon={<Clock className="h-4 w-4" />} label="Previsión" badge={`${forecastHours}h`}>
          <Slider
            value={[forecastHours]}
            onValueChange={(v) => onForecastHoursChange(v[0])}
            min={1} max={24} step={1} className="w-full mt-2"
          />
          <div className="flex justify-between text-[11px] text-foreground/50 mt-1">
            <span>1h</span><span>24h</span>
          </div>
        </Section>

        {/* Filtros Riesgo IA */}
        <Section icon={<Filter className="h-4 w-4" />} label="Filtros de Riesgo IA">
          <div className="space-y-2">
            {risks.map(([level, label, dot]) => {
              const active = riskFilters.includes(level);
              return (
                <button
                  key={level}
                  onClick={() => toggleRisk(level)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all",
                    active
                      ? "bg-white/10 text-foreground"
                      : "text-foreground/70 hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "h-4 w-4 rounded-sm border-2 flex items-center justify-center shrink-0 transition-all",
                    active ? `${dot.replace("bg-", "border-")} ${dot}` : "border-foreground/40"
                  )}>
                    {active && (
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={cn("flex items-center gap-2", active && "font-medium")}>
                    <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <div className="h-px bg-border/40" />

        {/* Aerolíneas */}
        <Section icon={<Plane className="h-4 w-4" />} label="Aerolíneas">
          <div className="relative" ref={alRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <Input
              value={alSearch}
              onChange={(e) => { setAlSearch(e.target.value); setAlOpen(true); }}
              onFocus={() => setAlOpen(true)}
              placeholder="Buscar aerolínea..."
              className="pl-9 h-9 text-[13px] text-foreground placeholder:text-foreground/40"
            />
            {alOpen && alSearch && filteredAl.length > 0 && (
              <Drop items={filteredAl} onSelect={(v) => { onAirlinesChange([...selectedAirlines, v]); setAlSearch(""); setAlOpen(false); }} />
            )}
          </div>
          <Tags items={selectedAirlines} onRemove={(v) => onAirlinesChange(selectedAirlines.filter((a) => a !== v))} />
        </Section>

        {/* Vuelos */}
        <Section icon={<Hash className="h-4 w-4" />} label="Vuelos">
          <div className="relative" ref={flRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <Input
              value={flSearch}
              onChange={(e) => { setFlSearch(e.target.value); setFlOpen(true); }}
              onFocus={() => setFlOpen(true)}
              placeholder="Buscar vuelo..."
              className="pl-9 h-9 text-[13px] font-mono text-foreground placeholder:text-foreground/40"
            />
            {flOpen && flSearch && filteredFl.length > 0 && (
              <Drop mono items={filteredFl} onSelect={(v) => { onFlightNumbersChange([...selectedFlightNumbers, v]); setFlSearch(""); setFlOpen(false); }} />
            )}
          </div>
          <Tags mono items={selectedFlightNumbers} onRemove={(v) => onFlightNumbersChange(selectedFlightNumbers.filter((f) => f !== v))} />
        </Section>
      </div>

      {/* Botón actualizar */}
      <div className="p-4 border-t border-border/60">
        <Button
          onClick={onRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="w-full h-9 text-[13px] text-foreground border-border/60 hover:bg-white/10"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Actualizando..." : "Actualizar Datos"}
        </Button>
      </div>
    </aside>
  );
}

function Section({
  icon, label, badge, children,
}: {
  icon: React.ReactNode; label: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground/60 uppercase tracking-wider">
          <span className="text-foreground/50">{icon}</span>
          {label}
        </div>
        {badge && (
          <span className="text-[13px] font-mono font-semibold text-primary">{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Drop({ items, onSelect, mono }: {
  items: string[]; onSelect: (v: string) => void; mono?: boolean;
}) {
  return (
    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-40 overflow-y-auto">
      {items.slice(0, 10).map((item) => (
        <button
          key={item}
          onClick={() => onSelect(item)}
          className={cn(
            "w-full px-3 py-2 text-left text-[13px] text-foreground hover:bg-accent transition-colors truncate",
            mono && "font-mono"
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function Tags({ items, onRemove, mono }: {
  items: string[]; onRemove: (v: string) => void; mono?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            "inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-0.5 text-[11px]",
            mono && "font-mono"
          )}
        >
          <span className="truncate max-w-[90px]">{item}</span>
          <button
            onClick={() => onRemove(item)}
            className="opacity-60 hover:opacity-100 transition-opacity ml-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
