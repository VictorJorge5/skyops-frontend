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
            <span className="text-border/80">â€”</span>
            <span className="text-primary truncate">{airportName}</span>
          </h1>
          <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5 mt-0.5">
            <Cpu className="h-3 w-3" />Predicciones alimentadas por IA
            {flightCount > 0 && <><span className="text-border mx-0.5">Â·</span><span className="text-primary/70 font-mono">{flightCount}</span><span>vuelos activos</span></>}
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
