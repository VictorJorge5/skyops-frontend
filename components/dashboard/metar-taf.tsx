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
        <div><h3 className="text-[13px] font-semibold">Reportes AeronÃ¡uticos</h3><p className="text-[11px] text-muted-foreground/60">{airport}</p></div>
        {(hasAlert(metar)||hasAlert(taf))&&<div className="ml-auto flex items-center gap-1.5 text-[11px] text-chart-3"><AlertTriangle className="h-3.5 w-3.5"/>Condiciones adversas</div>}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[{label:"METAR",sub:"Condiciones actuales",text:metar},{label:"TAF",sub:"PronÃ³stico 24â€“30h",text:taf}].map(({label,sub,text})=>(
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
