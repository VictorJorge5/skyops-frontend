# SkyOps Frontend — Setup automático
# Ejecutar desde: C:\Users\victo\Documents\skyops-frontend
# Comando: .\setup.ps1

Write-Host "🚀 Creando estructura de SkyOps Frontend..." -ForegroundColor Cyan

# Crear carpetas
New-Item -ItemType Directory -Force -Path "hooks" | Out-Null
New-Item -ItemType Directory -Force -Path "components\dashboard" | Out-Null

# ─── .env.local ───────────────────────────────────────────────────────────────
Set-Content -Path ".env.local" -Value 'NEXT_PUBLIC_API_URL=https://skyops-api.onrender.com'
Write-Host "✅ .env.local" -ForegroundColor Green

# ─── lib/api.ts ───────────────────────────────────────────────────────────────
Set-Content -Path "lib\api.ts" -Encoding UTF8 -Value @'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://skyops-api.onrender.com";

export interface ApiFlight {
  id: string; callsign: string; airline: string; aircraft: string;
  registration: string; origin: string; destination: string;
  altitude: number; speed: number; heading: number; verticalSpeed: number;
  latitude: number; longitude: number; eta: string;
  scheduledTime: string; estimatedTime: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH"; riskScore: number; riskLabel: string;
  windAtDest: number; precipAtDest: number;
}

export interface ApiWeatherPoint {
  hour: string; wind: number; gusts: number; direction: number;
  visibility: number; clouds: number; temp: number; precip: number;
}

export interface ApiFlightsResponse {
  airport: string; hours: number; timestamp: string;
  inAir: ApiFlight[]; arrivals: ApiFlight[]; departures: ApiFlight[];
  counts: { inAir: number; arrivals: number; departures: number };
}

export interface ApiWeatherResponse {
  airport: string; timestamp: string; forecast: ApiWeatherPoint[];
}

export interface ApiMetarResponse {
  airport: string; icao: string; metar: string; taf: string; timestamp: string;
}

export async function fetchFlights(airport: string, hours: number): Promise<ApiFlightsResponse> {
  const res = await fetch(`${API_BASE}/flights?airport=${airport}&hours=${hours}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchFlights error: ${res.status}`);
  return res.json();
}

export async function fetchWeather(iata: string): Promise<ApiWeatherResponse> {
  const res = await fetch(`${API_BASE}/weather/${iata}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchWeather error: ${res.status}`);
  return res.json();
}

export async function fetchMetar(iata: string): Promise<ApiMetarResponse> {
  const res = await fetch(`${API_BASE}/metar/${iata}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchMetar error: ${res.status}`);
  return res.json();
}
'@
Write-Host "✅ lib/api.ts" -ForegroundColor Green

# ─── lib/mock-data.ts ─────────────────────────────────────────────────────────
Set-Content -Path "lib\mock-data.ts" -Encoding UTF8 -Value @'
export const AIRPORTS = {
  ATL: { name: "Atlanta Hartsfield-Jackson", coords: [33.6407, -84.4277], icao: "KATL" },
  ORD: { name: "Chicago O'\''Hare",           coords: [41.9742, -87.9073], icao: "KORD" },
  LAX: { name: "Los Angeles International",  coords: [33.9416, -118.4085], icao: "KLAX" },
  JFK: { name: "New York JFK",               coords: [40.6413, -73.7781],  icao: "KJFK" },
} as const;

export type AirportCode = keyof typeof AIRPORTS;
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Flight {
  id: string; callsign: string; airline: string; aircraft: string;
  registration: string; origin: string; destination: string;
  altitude: number; speed: number; heading: number; verticalSpeed: number;
  latitude: number; longitude: number; eta: string;
  scheduledTime: string; estimatedTime: string;
  riskLevel: RiskLevel; riskScore: number;
  windAtDest: number; precipAtDest: number;
}

export interface WeatherData {
  hour: string; wind: number; gusts: number; visibility: number;
  clouds: number; temp: number; precip: number; direction: number;
}
'@
Write-Host "✅ lib/mock-data.ts" -ForegroundColor Green

# ─── hooks/useDashboardData.ts ────────────────────────────────────────────────
Set-Content -Path "hooks\useDashboardData.ts" -Encoding UTF8 -Value @'
"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchFlights, fetchWeather, fetchMetar, type ApiFlight, type ApiWeatherPoint } from "@/lib/api";
import type { Flight, WeatherData, RiskLevel } from "@/lib/mock-data";

function toFlight(f: ApiFlight): Flight {
  return { id: f.id, callsign: f.callsign, airline: f.airline, aircraft: f.aircraft,
    registration: f.registration, origin: f.origin, destination: f.destination,
    altitude: f.altitude, speed: f.speed, heading: f.heading, verticalSpeed: f.verticalSpeed,
    latitude: f.latitude, longitude: f.longitude, eta: f.eta,
    scheduledTime: f.scheduledTime, estimatedTime: f.estimatedTime,
    riskLevel: f.riskLevel as RiskLevel, riskScore: f.riskScore,
    windAtDest: f.windAtDest, precipAtDest: f.precipAtDest };
}

function toWeather(w: ApiWeatherPoint): WeatherData {
  return { hour: w.hour, wind: w.wind, gusts: w.gusts, visibility: w.visibility,
    clouds: w.clouds, temp: w.temp, precip: w.precip, direction: w.direction };
}

function airlineDist(flights: Flight[]) {
  const c: Record<string,number> = {};
  flights.forEach(f => { if (f.airline && f.airline !== "N/A") c[f.airline] = (c[f.airline]||0)+1; });
  return Object.entries(c).map(([airline,flights])=>({airline,flights})).sort((a,b)=>b.flights-a.flights);
}

function hourlyLoad(flights: Flight[], hours: number) {
  const now = new Date();
  const b: Record<string,number> = {};
  for (let i=0;i<hours;i++) {
    const h = new Date(now.getTime()+i*3600000);
    b[`${h.getUTCHours().toString().padStart(2,"0")}:00`]=0;
  }
  flights.forEach(f => {
    const d = new Date(f.scheduledTime);
    const k = `${d.getUTCHours().toString().padStart(2,"0")}:00`;
    if (k in b) b[k]++;
  });
  return Object.entries(b).map(([hour,flights])=>({hour,flights}));
}

export interface DashboardData {
  inAir: Flight[]; arrivals: Flight[]; departures: Flight[];
  weatherData: WeatherData[];
  airlineDistribution: { airline: string; flights: number }[];
  hourlyLoad: { hour: string; flights: number }[];
  metar: string; taf: string;
  isLoading: boolean; isRefreshing: boolean;
  error: string | null; lastUpdated: Date | null;
  refresh: () => void;
}

export function useDashboardData(airport: string, forecastHours: number): DashboardData {
  const [inAir,        setInAir]        = useState<Flight[]>([]);
  const [arrivals,     setArrivals]     = useState<Flight[]>([]);
  const [departures,   setDepartures]   = useState<Flight[]>([]);
  const [weatherData,  setWeatherData]  = useState<WeatherData[]>([]);
  const [metar,        setMetar]        = useState("");
  const [taf,          setTaf]          = useState("");
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error,        setError]        = useState<string|null>(null);
  const [lastUpdated,  setLastUpdated]  = useState<Date|null>(null);
  const [refreshKey,   setRefreshKey]   = useState(0);
  const refresh = useCallback(()=>setRefreshKey(k=>k+1),[]);

  useEffect(()=>{
    let cancelled = false;
    if (!lastUpdated) setIsLoading(true); else setIsRefreshing(true);
    setError(null);
    const iata = airport === "ALL" ? undefined : airport;

    async function load() {
      try {
        const fr = await fetchFlights(airport, forecastHours);
        if (cancelled) return;
        setInAir(fr.inAir.map(toFlight));
        setArrivals(fr.arrivals.map(toFlight));
        setDepartures(fr.departures.map(toFlight));
        setLastUpdated(new Date());
        const wxIata = iata || "ATL";
        const [wx, mt] = await Promise.all([fetchWeather(wxIata), iata ? fetchMetar(wxIata) : Promise.resolve(null)]);
        if (cancelled) return;
        setWeatherData(wx.forecast.map(toWeather));
        if (mt) { setMetar(mt.metar); setTaf(mt.taf); } else { setMetar(""); setTaf(""); }
      } catch(e:any) {
        if (!cancelled) setError(e.message||"Error cargando datos");
      } finally {
        if (!cancelled) { setIsLoading(false); setIsRefreshing(false); }
      }
    }
    load();
    return ()=>{ cancelled=true; };
  },[airport, forecastHours, refreshKey]);

  const all = [...inAir,...arrivals,...departures];
  return { inAir, arrivals, departures, weatherData,
    airlineDistribution: airlineDist(all),
    hourlyLoad: hourlyLoad([...arrivals,...departures], forecastHours),
    metar, taf, isLoading, isRefreshing, error, lastUpdated, refresh };
}
'@
Write-Host "✅ hooks/useDashboardData.ts" -ForegroundColor Green

# ─── components/dashboard/header.tsx ──────────────────────────────────────────
Set-Content -Path "components\dashboard\header.tsx" -Encoding UTF8 -Value @'
"use client";
import { Clock, Cpu, Radio, Signal } from "lucide-react";
import { useEffect, useState } from "react";

interface HeaderProps { airportName: string; flightCount?: number; }

export function Header({ airportName, flightCount = 0 }: HeaderProps) {
  const [time, setTime] = useState(""); const [date, setDate] = useState("");
  useEffect(()=>{
    const tick = () => {
      const n = new Date();
      setTime(n.toLocaleTimeString("es-ES",{timeZone:"UTC",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}));
      setDate(n.toLocaleDateString("es-ES",{timeZone:"UTC",year:"numeric",month:"2-digit",day:"2-digit"}));
    };
    tick(); const id = setInterval(tick,1000); return ()=>clearInterval(id);
  },[]);
  return (
    <header className="relative border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-40">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="flex items-center justify-between px-6 py-3 gap-4">
        <div>
          <h1 className="text-[15px] font-semibold text-foreground flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground font-normal">Panel de Operaciones</span>
            <span className="text-border/80">—</span>
            <span className="text-primary truncate">{airportName}</span>
          </h1>
          <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5 mt-0.5">
            <Cpu className="h-3 w-3" />Predicciones alimentadas por IA
            {flightCount > 0 && <><span className="text-border mx-0.5">·</span><span className="text-primary/70 font-mono">{flightCount}</span><span>vuelos activos</span></>}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5"><Signal className="h-3 w-3 text-chart-2 opacity-70" /><span className="text-muted-foreground">Sistema</span><span className="text-chart-2 font-medium">Online</span></div>
            <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-chart-2 animate-pulse" /><span className="text-muted-foreground">Radar</span><span className="text-chart-2 font-medium">Activo</span></div>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 border border-border/60">
            <Clock className="h-3.5 w-3.5 text-primary/60 shrink-0" />
            <div className="flex flex-col items-end">
              <span className="font-mono text-[13px] font-medium text-foreground tracking-wider leading-none">{time||"--:--:--"}</span>
              <span className="font-mono text-[9px] text-muted-foreground/60 tracking-widest leading-none mt-0.5">{date||"--/--/----"} ZULU</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
'@
Write-Host "✅ components/dashboard/header.tsx" -ForegroundColor Green

# ─── components/dashboard/kpi-cards.tsx ───────────────────────────────────────
Set-Content -Path "components\dashboard\kpi-cards.tsx" -Encoding UTF8 -Value @'
"use client";
import { Plane, PlaneLanding, PlaneTakeoff, Radio, Wind, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardsProps {
  radarCount: number; arrivalsCount: number; departuresCount: number; airportsCount: number;
  currentWind?: number; currentGusts?: number; selectedAirport?: string; isLoading?: boolean;
}

export function KPICards({ radarCount, arrivalsCount, departuresCount, airportsCount, currentWind, currentGusts, selectedAirport, isLoading=false }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KPI label="En Radar" value={radarCount} sub="Aproximando a bases" icon={<Plane className="h-5 w-5"/>} color="blue" isLoading={isLoading}/>
      <KPI label="Llegadas Prog." value={arrivalsCount} sub="Programadas" icon={<PlaneLanding className="h-5 w-5"/>} color="green" isLoading={isLoading}/>
      <KPI label="Salidas Prog." value={departuresCount} sub="Programadas" icon={<PlaneTakeoff className="h-5 w-5"/>} color="amber" isLoading={isLoading}/>
      {selectedAirport && currentWind !== undefined
        ? <KPI label={`Viento en ${selectedAirport}`} value={currentWind} unit="kts" sub={`Ráfagas: ${currentGusts??0} kts`} icon={<Wind className="h-5 w-5"/>} color="red" isLoading={isLoading} alert={currentWind>25}/>
        : <KPI label="Bases Monitorizadas" value={airportsCount} sub="Red completa activa" icon={<Radio className="h-5 w-5"/>} color="purple" isLoading={isLoading}/>}
    </div>
  );
}

const colorMap: Record<string,{bar:string;icon:string;bg:string;glow:string}> = {
  blue:  {bar:"bg-primary",  icon:"text-primary",  bg:"bg-primary/10",  glow:"shadow-[0_0_20px_hsl(var(--primary)/0.12)]"},
  green: {bar:"bg-chart-2",  icon:"text-chart-2",  bg:"bg-chart-2/10",  glow:"shadow-[0_0_20px_hsl(var(--chart-2)/0.12)]"},
  amber: {bar:"bg-chart-3",  icon:"text-chart-3",  bg:"bg-chart-3/10",  glow:"shadow-[0_0_20px_hsl(var(--chart-3)/0.12)]"},
  red:   {bar:"bg-chart-4",  icon:"text-chart-4",  bg:"bg-chart-4/10",  glow:"shadow-[0_0_20px_hsl(var(--chart-4)/0.12)]"},
  purple:{bar:"bg-chart-5",  icon:"text-chart-5",  bg:"bg-chart-5/10",  glow:"shadow-[0_0_20px_hsl(var(--chart-5)/0.12)]"},
};

function KPI({label,value,unit,sub,icon,color,isLoading,alert}:{label:string;value:number;unit?:string;sub:string;icon:React.ReactNode;color:string;isLoading?:boolean;alert?:boolean}) {
  const c = colorMap[color];
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all duration-300 hover:border-border hover:bg-card/80",c.glow,alert&&"border-chart-4/40")}>
      <div className={cn("absolute top-0 left-0 right-0 h-[2px]",c.bar)}/>
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wider mb-2 truncate">{label}</p>
          {isLoading ? <div className="h-9 w-20 bg-muted/60 animate-pulse rounded-md mb-1"/> : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[32px] font-bold leading-none tracking-tight text-foreground tabular-nums">{value}</span>
              {unit&&<span className="text-base font-normal text-muted-foreground">{unit}</span>}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground/60 truncate mt-1.5">{sub}</p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",c.bg,c.icon)}>{icon}</div>
      </div>
    </div>
  );
}
'@
Write-Host "✅ components/dashboard/kpi-cards.tsx" -ForegroundColor Green

# ─── components/dashboard/metar-taf.tsx ───────────────────────────────────────
Set-Content -Path "components\dashboard\metar-taf.tsx" -Encoding UTF8 -Value @'
"use client";
import { FileText, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetarTafProps { airport: string; metar: string; taf: string; }

export function MetarTafDisplay({ airport, metar, taf }: MetarTafProps) {
  const hasAlert = (t: string) => /TS|TSRA|\+RA|SN|FZ/i.test(t);
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><FileText className="h-3.5 w-3.5 text-primary"/></div>
        <div><h3 className="text-[13px] font-semibold">Reportes Aeronáuticos</h3><p className="text-[11px] text-muted-foreground/60">{airport}</p></div>
        {(hasAlert(metar)||hasAlert(taf))&&<div className="ml-auto flex items-center gap-1.5 text-[11px] text-chart-3"><AlertTriangle className="h-3.5 w-3.5"/>Condiciones adversas</div>}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[{label:"METAR",sub:"Condiciones actuales",text:metar},{label:"TAF",sub:"Pronóstico 24–30h",text:taf}].map(({label,sub,text})=>(
          <div key={label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full",hasAlert(text)?"bg-chart-4 animate-pulse":"bg-chart-2")}/><h4 className="text-[12px] font-semibold">{label}</h4><span className="text-[10px] text-muted-foreground/50">{sub}</span></div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40"><Clock className="h-3 w-3"/>UTC</div>
            </div>
            <div className={cn("rounded-lg bg-muted/30 border p-3",hasAlert(text)?"border-chart-4/20 bg-chart-4/5":"border-border/40")}>
              <code className="text-[11px] font-mono text-foreground/80 leading-relaxed break-all whitespace-pre-wrap">{text||"Sin datos"}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
'@
Write-Host "✅ components/dashboard/metar-taf.tsx" -ForegroundColor Green

# ─── components/dashboard/flights-table.tsx ───────────────────────────────────
Set-Content -Path "components\dashboard\flights-table.tsx" -Encoding UTF8 -Value @'
"use client";
import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Flight, RiskLevel } from "@/lib/mock-data";

type SF = "scheduledTime"|"callsign"|"airline"|"riskScore";
type SD = "asc"|"desc";

export function FlightsTable({ flights, type, riskFilters }: { flights: Flight[]; type: "arrivals"|"departures"; riskFilters: RiskLevel[] }) {
  const [search, setSearch] = useState("");
  const [sf, setSf] = useState<SF>("scheduledTime");
  const [sd, setSd] = useState<SD>("asc");

  const sort = (f: SF) => { if (sf===f) setSd(sd==="asc"?"desc":"asc"); else { setSf(f); setSd("asc"); } };

  const rows = useMemo(()=>{
    let f = flights.filter(fl=>riskFilters.includes(fl.riskLevel));
    if (search) { const q=search.toLowerCase(); f=f.filter(fl=>[fl.callsign,fl.airline,fl.origin,fl.destination,fl.aircraft].some(v=>v.toLowerCase().includes(q))); }
    return f.sort((a,b)=>{
      let c=0;
      if (sf==="scheduledTime") c=new Date(a.scheduledTime).getTime()-new Date(b.scheduledTime).getTime();
      else if (sf==="callsign") c=a.callsign.localeCompare(b.callsign);
      else if (sf==="airline")  c=a.airline.localeCompare(b.airline);
      else c=a.riskScore-b.riskScore;
      return sd==="asc"?c:-c;
    });
  },[flights,search,sf,sd,riskFilters]);

  const fmt = (iso:string) => new Date(iso).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",timeZone:"UTC"})+"Z";
  const delayed = (s:string,e:string) => new Date(e).getTime()-new Date(s).getTime()>600000;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50"/>
          <Input placeholder="Buscar vuelo, aerolínea, origen…" value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 h-9"/>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
          {(["LOW","MEDIUM","HIGH"] as RiskLevel[]).map(l=>(
            <span key={l} className="flex items-center gap-1">
              <span className={cn("h-1.5 w-1.5 rounded-full",l==="LOW"?"bg-chart-2":l==="MEDIUM"?"bg-chart-3":"bg-chart-4")}/>
              {flights.filter(f=>f.riskLevel===l).length} {l==="LOW"?"bajo":l==="MEDIUM"?"medio":"alto"}
            </span>
          ))}
          <span className="text-muted-foreground/40 font-mono">{rows.length}/{flights.length}</span>
        </div>
      </div>
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-border/40">
                {([["scheduledTime","Prog. (Z)","w-[88px]"],["","Est. (Z)","w-[76px]"],["callsign","Vuelo",""],["airline","Aerolínea",""],["","Avión","w-[72px]"],["","Matrícula","w-[88px]"],["","Orig","w-[56px]"],["","Dest","w-[56px]"],["riskScore","Riesgo IA","text-right"]] as [string,string,string][]).map(([field,label,cls],i)=>(
                  <TableHead key={i} className={cn("text-[11px] uppercase tracking-wider",cls)}>
                    {field ? (
                      <button onClick={()=>sort(field as SF)} className={cn("flex items-center gap-1 font-semibold transition-colors hover:text-foreground",sf===field?"text-primary":"text-muted-foreground/60")}>
                        {label}{sf===field?(sd==="asc"?<ArrowUp className="h-3 w-3"/>:<ArrowDown className="h-3 w-3"/>):<ArrowUpDown className="h-3 w-3 opacity-40"/>}
                      </button>
                    ) : <span className="font-semibold text-muted-foreground/60">{label}</span>}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length===0 ? (
                <TableRow><TableCell colSpan={9} className="h-32 text-center"><div className="flex flex-col items-center gap-2 text-muted-foreground/50"><Plane className="h-7 w-7 opacity-30"/><p className="text-sm">Sin resultados</p></div></TableCell></TableRow>
              ) : rows.map(f=>{
                const del = delayed(f.scheduledTime,f.estimatedTime);
                const acc = f.riskLevel==="HIGH"?"hover:bg-chart-4/5 border-l-2 border-l-chart-4/40":f.riskLevel==="MEDIUM"?"hover:bg-chart-3/5 border-l-2 border-l-chart-3/20":"hover:bg-muted/20 border-l-2 border-l-transparent";
                return (
                  <TableRow key={f.id} className={cn("transition-colors border-border/30 group cursor-default",acc)}>
                    <TableCell className="font-mono text-[12px] text-foreground/90">{fmt(f.scheduledTime)}</TableCell>
                    <TableCell className={cn("font-mono text-[12px]",del?"text-chart-4/80":"text-muted-foreground/60")}>{fmt(f.estimatedTime)}{del&&<span className="ml-1 text-[10px]">▲</span>}</TableCell>
                    <TableCell><span className="font-semibold font-mono text-[13px] text-foreground group-hover:text-primary transition-colors">{f.callsign}</span></TableCell>
                    <TableCell className="text-[12px] text-muted-foreground/80">{f.airline}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground/60">{f.aircraft}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground/50">{f.registration}</TableCell>
                    <TableCell><span className="text-[12px] font-semibold text-muted-foreground/70">{f.origin}</span></TableCell>
                    <TableCell><span className="text-[12px] font-semibold text-foreground/90">{f.destination}</span></TableCell>
                    <TableCell className="text-right">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium",
                        f.riskLevel==="LOW"?"bg-chart-2/10 text-chart-2 border-chart-2/25":f.riskLevel==="MEDIUM"?"bg-chart-3/10 text-chart-3 border-chart-3/25":"bg-chart-4/12 text-chart-4 border-chart-4/30")}>
                        <span className={cn("h-1.5 w-1.5 rounded-full",f.riskLevel==="LOW"?"bg-chart-2":f.riskLevel==="MEDIUM"?"bg-chart-3":"bg-chart-4 animate-pulse")}/>
                        {Math.round(f.riskScore*100)}% {f.riskLevel==="LOW"?"Baja":f.riskLevel==="MEDIUM"?"Media":"Alta"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
'@
Write-Host "✅ components/dashboard/flights-table.tsx" -ForegroundColor Green

# ─── components/dashboard/weather-charts.tsx ──────────────────────────────────
Set-Content -Path "components\dashboard\weather-charts.tsx" -Encoding UTF8 -Value @'
"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import type { WeatherData } from "@/lib/mock-data";

const GRID = "hsl(220 16% 16% / 0.8)";
const TICK = "hsl(215 18% 38%)";
const TT = { backgroundColor:"hsl(222 22% 8%)",border:"1px solid hsl(220 16% 18%)",borderRadius:"8px",fontSize:"12px",fontFamily:"monospace" };

function Card({title,sub,children}:{title:string;sub:string;children:React.ReactNode}) {
  return <div className="rounded-xl border border-border/60 bg-card p-4"><div className="mb-4"><h3 className="text-[13px] font-semibold">{title}</h3><p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p></div>{children}</div>;
}

export function WindChart({data,airport}:{data:WeatherData[];airport:string}) {
  const d = data.map(w=>({hour:new Date(w.hour).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",timeZone:"UTC"}),wind:Math.round(w.wind),gusts:Math.round(w.gusts)}));
  return <Card title="Evolución del Viento" sub={`${airport} · Próximas 24h`}>
    <div className="h-[200px]"><ResponsiveContainer width="100%" height="100%">
      <AreaChart data={d} margin={{top:8,right:8,left:-8,bottom:0}}>
        <defs>
          <linearGradient id="wf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(210 100% 60%)" stopOpacity={0.25}/><stop offset="95%" stopColor="hsl(210 100% 60%)" stopOpacity={0.02}/></linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false}/>
        <XAxis dataKey="hour" tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
        <YAxis tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false} unit=" kts" width={44}/>
        <Tooltip contentStyle={TT} labelStyle={{color:"hsl(214 32% 70%)"}} cursor={{stroke:"hsl(210 100% 60% / 0.2)",strokeWidth:1}}/>
        <Area type="monotone" dataKey="gusts" stroke="hsl(0 84% 60%)" strokeWidth={1.5} strokeDasharray="5 3" fill="transparent" name="Ráfagas" dot={false}/>
        <Area type="monotone" dataKey="wind" stroke="hsl(210 100% 60%)" strokeWidth={2} fill="url(#wf)" name="Viento" dot={false}/>
      </AreaChart>
    </ResponsiveContainer></div>
    <div className="flex items-center justify-center gap-6 mt-2 text-[11px] text-muted-foreground/60">
      <span className="flex items-center gap-1.5"><span className="inline-block h-[2px] w-5 rounded" style={{background:"hsl(210 100% 60%)"}}/>Viento</span>
      <span className="flex items-center gap-1.5"><span className="inline-block h-[2px] w-5" style={{borderTop:"1px dashed hsl(0 84% 60%)",height:0}}/>Ráfagas</span>
    </div>
  </Card>;
}

export function PrecipChart({data,airport}:{data:WeatherData[];airport:string}) {
  const d = data.map(w=>({hour:new Date(w.hour).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",timeZone:"UTC"}),precip:Math.round(w.precip*10)/10}));
  return <Card title="Precipitaciones Esperadas" sub={`${airport} · Próximas 24h`}>
    <div className="h-[200px]"><ResponsiveContainer width="100%" height="100%">
      <BarChart data={d} margin={{top:8,right:8,left:-8,bottom:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false}/>
        <XAxis dataKey="hour" tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
        <YAxis tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false} unit=" mm" width={44}/>
        <Tooltip contentStyle={TT} labelStyle={{color:"hsl(214 32% 70%)"}} cursor={{fill:"hsl(210 100% 60% / 0.05)"}}/>
        <Bar dataKey="precip" radius={[3,3,0,0]} name="Lluvia (mm)">
          {d.map((e,i)=><Cell key={i} fill={e.precip>2?"hsl(210 100% 55%)":e.precip>0.5?"hsl(210 100% 50% / 0.75)":"hsl(210 100% 45% / 0.4)"}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer></div>
  </Card>;
}

export function AirlineDistributionChart({data,airport,hours}:{data:{airline:string;flights:number}[];airport:string;hours:number}) {
  const max = Math.max(...data.map(d=>d.flights),0);
  return <Card title="Distribución de Aerolíneas" sub={`${airport} · Próximas ${hours}h`}>
    <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.slice(0,8)} layout="vertical" margin={{top:0,right:16,left:0,bottom:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false}/>
        <XAxis type="number" tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false}/>
        <YAxis type="category" dataKey="airline" tick={{fontSize:11,fill:TICK}} tickLine={false} axisLine={false} width={110} tickFormatter={v=>v.replace(" Airlines","").replace(" Airways","")}/>
        <Tooltip contentStyle={TT} labelStyle={{color:"hsl(214 32% 70%)"}} cursor={{fill:"hsl(142 71% 45% / 0.05)"}}/>
        <Bar dataKey="flights" radius={[0,4,4,0]} name="Vuelos">
          {data.slice(0,8).map((e,i)=><Cell key={i} fill={e.flights===max?"hsl(142 71% 45%)":`hsl(142 71% 45% / ${0.7-i*0.07})`}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer></div>
  </Card>;
}

export function HourlyLoadChart({data,airport,hours}:{data:{hour:string;flights:number}[];airport:string;hours:number}) {
  const max = Math.max(...data.map(d=>d.flights),0);
  const avg = data.length ? Math.round(data.reduce((s,d)=>s+d.flights,0)/data.length) : 0;
  return <Card title="Carga Operativa por Hora" sub={`${airport} · Próximas ${hours}h`}>
    <div className="h-[200px]"><ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{top:8,right:8,left:-8,bottom:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false}/>
        <XAxis dataKey="hour" tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false} interval={Math.ceil(data.length/8)}/>
        <YAxis tick={{fontSize:10,fill:TICK}} tickLine={false} axisLine={false} width={28}/>
        <Tooltip contentStyle={TT} labelStyle={{color:"hsl(214 32% 70%)"}} cursor={{fill:"hsl(38 92% 55% / 0.06)"}}/>
        <Bar dataKey="flights" radius={[3,3,0,0]} name="Vuelos">
          {data.map((e,i)=><Cell key={i} fill={e.flights===max?"hsl(0 84% 60%)":e.flights>avg?"hsl(38 92% 55%)":"hsl(38 92% 55% / 0.6)"}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer></div>
  </Card>;
}
'@
Write-Host "✅ components/dashboard/weather-charts.tsx" -ForegroundColor Green

# ─── components/dashboard/sidebar-filters.tsx ─────────────────────────────────
Set-Content -Path "components\dashboard\sidebar-filters.tsx" -Encoding UTF8 -Value @'
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
  selectedAirport:string; onAirportChange:(v:string)=>void;
  forecastHours:number; onForecastHoursChange:(v:number)=>void;
  riskFilters:RiskLevel[]; onRiskFilterChange:(f:RiskLevel[])=>void;
  airlines:string[]; selectedAirlines:string[]; onAirlinesChange:(a:string[])=>void;
  flightNumbers:string[]; selectedFlightNumbers:string[]; onFlightNumbersChange:(n:string[])=>void;
  onRefresh:()=>void; isRefreshing?:boolean;
}

export function SidebarFilters({selectedAirport,onAirportChange,forecastHours,onForecastHoursChange,riskFilters,onRiskFilterChange,airlines,selectedAirlines,onAirlinesChange,flightNumbers,selectedFlightNumbers,onFlightNumbersChange,onRefresh,isRefreshing=false}:Props) {
  const [alSearch,setAlSearch]=useState(""); const [flSearch,setFlSearch]=useState("");
  const [alOpen,setAlOpen]=useState(false); const [flOpen,setFlOpen]=useState(false);
  const alRef=useRef<HTMLDivElement>(null); const flRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const h=(e:MouseEvent)=>{
      if(alRef.current&&!alRef.current.contains(e.target as Node))setAlOpen(false);
      if(flRef.current&&!flRef.current.contains(e.target as Node))setFlOpen(false);
    };
    document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h);
  },[]);

  const toggleRisk=(r:RiskLevel)=>onRiskFilterChange(riskFilters.includes(r)?riskFilters.filter(x=>x!==r):[...riskFilters,r]);
  const filteredAl=airlines.filter(a=>a.toLowerCase().includes(alSearch.toLowerCase())&&!selectedAirlines.includes(a));
  const filteredFl=flightNumbers.filter(f=>f.toLowerCase().includes(flSearch.toLowerCase())&&!selectedFlightNumbers.includes(f));

  const risks:[RiskLevel,string,string][]=[["LOW","Probabilidad BAJA","bg-chart-2"],["MEDIUM","Probabilidad MEDIA","bg-chart-3"],["HIGH","Probabilidad ALTA","bg-chart-4"]];

  return (
    <aside className="w-[220px] min-w-[220px] border-r border-border/60 bg-sidebar flex flex-col h-full">
      <div className="px-4 py-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 border border-primary/20"><Plane className="h-4 w-4 text-primary"/></div>
          <div><p className="text-[14px] font-semibold leading-tight">SkyOps AI</p><p className="text-[10px] text-muted-foreground/60">Centro de Control</p></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        <Section icon={<MapPin className="h-3.5 w-3.5"/>} label="Aeropuerto">
          <Select value={selectedAirport} onValueChange={onAirportChange}>
            <SelectTrigger className="h-8 text-[12px] w-full"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-[12px]">Todos los Aeropuertos</SelectItem>
              {(Object.keys(AIRPORTS) as AirportCode[]).map(c=>(
                <SelectItem key={c} value={c} className="text-[12px]"><span className="font-mono font-semibold">{c}</span><span className="text-muted-foreground ml-1.5 text-[11px]">{AIRPORTS[c].name.split(" ").slice(0,2).join(" ")}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>
        <Section icon={<Clock className="h-3.5 w-3.5"/>} label="Previsión" badge={`${forecastHours}h`}>
          <Slider value={[forecastHours]} onValueChange={v=>onForecastHoursChange(v[0])} min={1} max={24} step={1} className="w-full mt-1"/>
          <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1"><span>1h</span><span>24h</span></div>
        </Section>
        <Section icon={<Filter className="h-3.5 w-3.5"/>} label="Filtros Riesgo IA">
          <div className="space-y-1.5">
            {risks.map(([level,label,dot])=>{
              const active=riskFilters.includes(level);
              return <button key={level} onClick={()=>toggleRisk(level)} className={cn("w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[11px] transition-all",active?"bg-sidebar-accent/80 text-foreground":"text-muted-foreground/60 hover:bg-sidebar-accent/40 hover:text-foreground")}>
                <div className={cn("h-4 w-4 rounded-sm border-2 flex items-center justify-center shrink-0 transition-all",active?`${dot.replace("bg-","border-")} ${dot}`:"border-muted-foreground/30")}>
                  {active&&<svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg>}
                </div>
                <span className={cn("flex items-center gap-1.5",active&&"font-medium")}><span className={cn("h-1.5 w-1.5 rounded-full",dot)}/>{label}</span>
              </button>;
            })}
          </div>
        </Section>
        <div className="h-px bg-border/40"/>
        <Section icon={<Plane className="h-3.5 w-3.5"/>} label="Aerolíneas">
          <div className="relative" ref={alRef}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40"/>
            <Input value={alSearch} onChange={e=>{setAlSearch(e.target.value);setAlOpen(true);}} onFocus={()=>setAlOpen(true)} placeholder="Buscar aerolínea…" className="pl-7 h-8 text-[11px]"/>
            {alOpen&&alSearch&&filteredAl.length>0&&<Drop items={filteredAl} onSelect={v=>{onAirlinesChange([...selectedAirlines,v]);setAlSearch("");setAlOpen(false);}}/>}
          </div>
          <Tags items={selectedAirlines} onRemove={v=>onAirlinesChange(selectedAirlines.filter(a=>a!==v))}/>
        </Section>
        <Section icon={<Hash className="h-3.5 w-3.5"/>} label="Vuelos">
          <div className="relative" ref={flRef}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40"/>
            <Input value={flSearch} onChange={e=>{setFlSearch(e.target.value);setFlOpen(true);}} onFocus={()=>setFlOpen(true)} placeholder="Buscar vuelo…" className="pl-7 h-8 text-[11px] font-mono"/>
            {flOpen&&flSearch&&filteredFl.length>0&&<Drop mono items={filteredFl} onSelect={v=>{onFlightNumbersChange([...selectedFlightNumbers,v]);setFlSearch("");setFlOpen(false);}}/>}
          </div>
          <Tags mono items={selectedFlightNumbers} onRemove={v=>onFlightNumbersChange(selectedFlightNumbers.filter(f=>f!==v))}/>
        </Section>
      </div>
      <div className="p-3 border-t border-border/60">
        <Button onClick={onRefresh} disabled={isRefreshing} variant="outline" size="sm" className="w-full h-8 text-[12px]">
          <RefreshCw className={cn("h-3.5 w-3.5 mr-2",isRefreshing&&"animate-spin")}/>{isRefreshing?"Actualizando…":"Actualizar Datos"}
        </Button>
      </div>
    </aside>
  );
}

function Section({icon,label,badge,children}:{icon:React.ReactNode;label:string;badge?:string;children:React.ReactNode}) {
  return <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider"><span className="text-muted-foreground/40">{icon}</span>{label}</div>
      {badge&&<span className="text-[11px] font-mono font-semibold text-primary">{badge}</span>}
    </div>
    {children}
  </div>;
}

function Drop({items,onSelect,mono}:{items:string[];onSelect:(v:string)=>void;mono?:boolean}) {
  return <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-36 overflow-y-auto">
    {items.slice(0,8).map(item=><button key={item} onClick={()=>onSelect(item)} className={cn("w-full px-3 py-1.5 text-left text-[11px] hover:bg-accent transition-colors truncate",mono&&"font-mono")}>{item}</button>)}
  </div>;
}

function Tags({items,onRemove,mono}:{items:string[];onRemove:(v:string)=>void;mono?:boolean}) {
  if(!items.length) return null;
  return <div className="flex flex-wrap gap-1 mt-1.5">
    {items.map(item=><span key={item} className={cn("inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-md px-1.5 py-0.5 text-[10px]",mono&&"font-mono")}>
      <span className="truncate max-w-[80px]">{item}</span>
      <button onClick={()=>onRemove(item)} className="opacity-60 hover:opacity-100 transition-opacity ml-0.5"><X className="h-2.5 w-2.5"/></button>
    </span>)}
  </div>;
}
'@
Write-Host "✅ components/dashboard/sidebar-filters.tsx" -ForegroundColor Green

# ─── components/dashboard/radar-map.tsx ───────────────────────────────────────
Set-Content -Path "components\dashboard\radar-map.tsx" -Encoding UTF8 -Value @'
"use client";
import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AIRPORTS, type AirportCode, type Flight, type RiskLevel } from "@/lib/mock-data";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const riskColors:Record<RiskLevel,string>={LOW:"#3fb950",MEDIUM:"#e3b341",HIGH:"#f85149"};

const planeIcon=(risk:RiskLevel,heading:number)=>L.divIcon({
  className:"",
  html:`<div style="transform:rotate(${heading}deg);color:${riskColors[risk]};filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));font-size:20px;display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg></div>`,
  iconSize:[22,22],iconAnchor:[11,11],popupAnchor:[0,-11],
});

const airportIcon=L.divIcon({
  className:"",
  html:`<div style="background:rgba(22,27,34,0.95);border:2px solid #388bfd;border-radius:8px;padding:5px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#388bfd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h18"/></svg></div>`,
  iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-15],
});

function MapUpdater({center,zoom}:{center:[number,number];zoom:number}) {
  const map=useMap();
  useMemo(()=>map.setView(center,zoom,{animate:true}),[map,center,zoom]);
  return null;
}

interface RadarMapProps { flights:Flight[]; selectedAirport:string; riskFilters?:RiskLevel[]; weatherData:{direction:number;wind:number}[]; }

export function RadarMap({flights,selectedAirport,weatherData}:RadarMapProps) {
  const [sel,setSel]=useState<Flight|null>(null);
  const center=useMemo(():[ number,number]=>selectedAirport!=="ALL"&&AIRPORTS[selectedAirport as AirportCode]?AIRPORTS[selectedAirport as AirportCode].coords as [number,number]:[39.5,-98.35],[selectedAirport]);
  const zoom=selectedAirport==="ALL"?4:6;
  const apts=useMemo(()=>selectedAirport==="ALL"?Object.keys(AIRPORTS) as AirportCode[]:[selectedAirport as AirportCode],[selectedAirport]);
  const wind=weatherData.length>0?{direction:weatherData[0].direction,wind:Math.round(weatherData[0].wind)}:{direction:270,wind:12};

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="h-[500px] lg:h-[600px] relative">
        <MapContainer center={center} zoom={zoom} style={{height:"100%",width:"100%"}} className="z-0">
          <MapUpdater center={center} zoom={zoom}/>
          <TileLayer attribution='&copy; <a href="https://carto.com/">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
          {apts.map(code=>(
            <Marker key={code} position={AIRPORTS[code].coords as [number,number]} icon={airportIcon}>
              <Popup><div style={{minWidth:160,fontFamily:"sans-serif",fontSize:13}}><b>{AIRPORTS[code].name}</b><br/><span style={{color:"#888"}}>{AIRPORTS[code].icao} / {code}</span><br/>Viento: {wind.wind} kts @ {wind.direction}°</div></Popup>
            </Marker>
          ))}
          {flights.filter(f=>f.latitude!==0&&f.longitude!==0).map(f=>(
            <Marker key={f.id} position={[f.latitude,f.longitude]} icon={planeIcon(f.riskLevel,f.heading)} eventHandlers={{click:()=>setSel(f)}}>
              <Popup>
                <div style={{minWidth:220,fontFamily:"sans-serif",fontSize:12}}>
                  <div style={{fontWeight:700,fontSize:14,color:riskColors[f.riskLevel],marginBottom:4}}>✈ {f.callsign}</div>
                  <div style={{color:"#888",marginBottom:6}}>{f.airline} · {f.aircraft} · {f.registration}</div>
                  <div><b>{f.origin}</b> → <b>{f.destination}</b></div>
                  <hr style={{margin:"6px 0",opacity:.2}}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                    <span>Alt: {f.altitude.toLocaleString()} ft</span><span>Vel: {f.speed} kts</span>
                    <span>Rumbo: {f.heading}°</span><span>V/S: {f.verticalSpeed>0?"+":""}{f.verticalSpeed} fpm</span>
                  </div>
                  <hr style={{margin:"6px 0",opacity:.2}}/>
                  <div>Riesgo IA: <b style={{color:riskColors[f.riskLevel]}}>{Math.round(f.riskScore*100)}% {f.riskLevel==="LOW"?"Baja":f.riskLevel==="MEDIUM"?"Media":"Alta"}</b></div>
                  <div>Viento dest: {f.windAtDest} kts · Lluvia: {f.precipAtDest.toFixed(1)} mm</div>
                </div>
              </Popup>
            </Marker>
          ))}
          {sel&&AIRPORTS[sel.destination as AirportCode]&&(
            <Polyline positions={[[sel.latitude,sel.longitude],AIRPORTS[sel.destination as AirportCode].coords as [number,number]]} pathOptions={{color:"#388bfd",weight:2,dashArray:"5,10",opacity:.6}}/>
          )}
        </MapContainer>
        <div style={{position:"absolute",bottom:16,left:16,zIndex:1000,background:"rgba(13,17,23,.9)",border:"1px solid #30363d",borderRadius:8,padding:"8px 12px",fontSize:11}}>
          <div style={{fontWeight:600,marginBottom:6,color:"#e6edf3"}}>Leyenda</div>
          {(["LOW","MEDIUM","HIGH"] as RiskLevel[]).map(l=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,color:"#8b949e"}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:riskColors[l],display:"inline-block"}}/>
              {l==="LOW"?"Riesgo Bajo":l==="MEDIUM"?"Riesgo Medio":"Riesgo Alto"}
            </div>
          ))}
        </div>
        <div style={{position:"absolute",top:16,right:16,zIndex:1000,background:"rgba(13,17,23,.9)",border:"1px solid #30363d",borderRadius:8,padding:"8px 12px",fontSize:11}}>
          <div style={{fontWeight:600,marginBottom:4,color:"#e6edf3"}}>Radar Activo</div>
          <div style={{color:"#8b949e"}}>{flights.filter(f=>f.latitude!==0).length} aviones en seguimiento</div>
        </div>
      </div>
    </div>
  );
}
'@
Write-Host "✅ components/dashboard/radar-map.tsx" -ForegroundColor Green

# ─── app/page.tsx ──────────────────────────────────────────────────────────────
Set-Content -Path "app\page.tsx" -Encoding UTF8 -Value @'
"use client";
import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map, PlaneLanding, PlaneTakeoff, BarChart3, AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { SidebarFilters } from "@/components/dashboard/sidebar-filters";
import { Header } from "@/components/dashboard/header";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { FlightsTable } from "@/components/dashboard/flights-table";
import { WindChart, PrecipChart, AirlineDistributionChart, HourlyLoadChart } from "@/components/dashboard/weather-charts";
import { MetarTafDisplay } from "@/components/dashboard/metar-taf";
import { useDashboardData } from "@/hooks/useDashboardData";
import { AIRPORTS, type AirportCode, type RiskLevel } from "@/lib/mock-data";

const RadarMap = dynamic(()=>import("@/components/dashboard/radar-map").then(m=>m.RadarMap),{
  ssr:false,
  loading:()=><div className="rounded-lg border border-border bg-card h-[500px] lg:h-[600px] flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"/><p className="text-muted-foreground">Cargando radar...</p></div></div>,
});

export default function Dashboard() {
  const [airport,setAirport]=useState<string>("ALL");
  const [hours,setHours]=useState(15);
  const [riskFilters,setRiskFilters]=useState<RiskLevel[]>(["LOW","MEDIUM","HIGH"]);
  const [selAirlines,setSelAirlines]=useState<string[]>([]);
  const [selFlights,setSelFlights]=useState<string[]>([]);

  const {inAir,arrivals,departures,weatherData,airlineDistribution,hourlyLoad,metar,taf,isLoading,isRefreshing,error,lastUpdated,refresh} = useDashboardData(airport,hours);

  const aptName = useMemo(()=>airport==="ALL"?"Estados Unidos (Global)":AIRPORTS[airport as AirportCode]?.name||airport,[airport]);
  const wx = useMemo(()=>weatherData.length>0?{wind:Math.round(weatherData[0].wind),gusts:Math.round(weatherData[0].gusts)}:{wind:0,gusts:0},[weatherData]);

  const avAirlines=useMemo(()=>{const s=new Set<string>();[...arrivals,...departures,...inAir].forEach(f=>{if(f.airline&&f.airline!=="N/A")s.add(f.airline);});return Array.from(s).sort();},[inAir,arrivals,departures]);
  const avFlights=useMemo(()=>{const s=new Set<string>();[...arrivals,...departures,...inAir].forEach(f=>{if(f.callsign&&f.callsign!=="N/A")s.add(f.callsign);});return Array.from(s).sort();},[inAir,arrivals,departures]);

  const filter=useCallback((flights:typeof inAir)=>flights.filter(f=>{
    if(!riskFilters.includes(f.riskLevel))return false;
    if(selAirlines.length>0&&!selAirlines.includes(f.airline))return false;
    if(selFlights.length>0&&!selFlights.includes(f.callsign))return false;
    return true;
  }),[riskFilters,selAirlines,selFlights]);

  const fInAir=useMemo(()=>filter(inAir),[filter,inAir]);
  const fArr=useMemo(()=>filter(arrivals),[filter,arrivals]);
  const fDep=useMemo(()=>filter(departures),[filter,departures]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SidebarFilters selectedAirport={airport} onAirportChange={setAirport} forecastHours={hours} onForecastHoursChange={setHours} riskFilters={riskFilters} onRiskFilterChange={setRiskFilters} airlines={avAirlines} selectedAirlines={selAirlines} onAirlinesChange={setSelAirlines} flightNumbers={avFlights} selectedFlightNumbers={selFlights} onFlightNumbersChange={setSelFlights} onRefresh={refresh} isRefreshing={isRefreshing}/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header airportName={aptName} flightCount={inAir.length}/>
        {(error||isRefreshing||lastUpdated)&&(
          <div className={`px-6 py-1.5 text-xs flex items-center gap-2 border-b border-border/40 ${error?"bg-chart-4/5 text-chart-4":"bg-muted/30 text-muted-foreground"}`}>
            {error?<><WifiOff className="h-3 w-3"/>{error}</>:isRefreshing?<><RefreshCw className="h-3 w-3 animate-spin"/>Actualizando datos en vivo...</>:lastUpdated?<><Wifi className="h-3 w-3 text-chart-2"/>Datos en vivo · Última actualización: {lastUpdated.toLocaleTimeString("es-ES",{timeZone:"UTC"})} UTC</>:null}
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <KPICards radarCount={fInAir.length} arrivalsCount={fArr.length} departuresCount={fDep.length} airportsCount={airport==="ALL"?Object.keys(AIRPORTS).length:1} currentWind={airport!=="ALL"?wx.wind:undefined} currentGusts={airport!=="ALL"?wx.gusts:undefined} selectedAirport={airport!=="ALL"?airport:undefined} isLoading={isLoading}/>
          <Tabs defaultValue="radar" className="space-y-4">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="radar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"><Map className="h-4 w-4"/>Radar en Vivo</TabsTrigger>
              <TabsTrigger value="arrivals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"><PlaneLanding className="h-4 w-4"/>Llegadas{fArr.length>0&&<span className="ml-1 bg-primary/20 text-primary text-[10px] font-mono px-1.5 py-0.5 rounded-full">{fArr.length}</span>}</TabsTrigger>
              <TabsTrigger value="departures" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"><PlaneTakeoff className="h-4 w-4"/>Salidas{fDep.length>0&&<span className="ml-1 bg-primary/20 text-primary text-[10px] font-mono px-1.5 py-0.5 rounded-full">{fDep.length}</span>}</TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"><BarChart3 className="h-4 w-4"/>Dashboard Analítico</TabsTrigger>
            </TabsList>
            <TabsContent value="radar" className="space-y-4">
              {isLoading?<div className="rounded-lg border border-border bg-card h-[500px] flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"/><p className="text-muted-foreground text-sm">Conectando con FlightRadar24...</p><p className="text-muted-foreground/50 text-xs mt-1">Primera carga puede tardar ~30s</p></div></div>:<RadarMap flights={fInAir} selectedAirport={airport} riskFilters={riskFilters} weatherData={weatherData}/>}
              <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                <span className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-chart-2 animate-pulse"/>Radar Activo: {fInAir.length} aviones · {fArr.length} llegadas · {fDep.length} salidas</span>
                <span className="text-xs">Datos: FlightRadar24 + IA</span>
              </div>
            </TabsContent>
            <TabsContent value="arrivals">{isLoading?<Spinner/>:<FlightsTable flights={fArr} type="arrivals" riskFilters={riskFilters}/>}</TabsContent>
            <TabsContent value="departures">{isLoading?<Spinner/>:<FlightsTable flights={fDep} type="departures" riskFilters={riskFilters}/>}</TabsContent>
            <TabsContent value="analytics" className="space-y-6">
              {airport==="ALL"?<div className="rounded-lg border border-border bg-card p-8 text-center"><AlertTriangle className="h-12 w-12 text-chart-3 mx-auto mb-4"/><h3 className="text-lg font-semibold mb-2">Selecciona un aeropuerto específico</h3><p className="text-muted-foreground max-w-md mx-auto">Para ver gráficos detallados selecciona un aeropuerto en el panel lateral.</p></div>:<>
                <div className="grid lg:grid-cols-2 gap-4"><WindChart data={weatherData} airport={airport}/><PrecipChart data={weatherData} airport={airport}/></div>
                <div className="grid lg:grid-cols-2 gap-4"><AirlineDistributionChart data={airlineDistribution} airport={airport} hours={hours}/><HourlyLoadChart data={hourlyLoad} airport={airport} hours={hours}/></div>
                {metar&&taf&&<MetarTafDisplay airport={airport} metar={metar} taf={taf}/>}
              </>}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

function Spinner(){return <div className="rounded-xl border border-border/60 bg-card p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"/><p className="text-sm text-muted-foreground">Cargando vuelos en vivo...</p></div>;}
'@
Write-Host "✅ app/page.tsx" -ForegroundColor Green

Write-Host ""
Write-Host "✅ ¡Todo listo! Ahora ejecuta: npm run dev" -ForegroundColor Cyan
