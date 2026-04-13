"use client";

import { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, Plane } from "lucide-react";
import type { Flight, RiskLevel } from "@/lib/mock-data";

type SortField = "scheduledTime" | "callsign" | "airline" | "riskScore";
type SortDirection = "asc" | "desc";

export function FlightsTable({
  flights, type, riskFilters,
}: {
  flights: Flight[];
  type: "arrivals" | "departures";
  riskFilters: RiskLevel[];
}) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("scheduledTime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const rows = useMemo(() => {
    let f = flights.filter((fl) => riskFilters.includes(fl.riskLevel));
    if (search) {
      const q = search.toLowerCase();
      f = f.filter((fl) =>
        [fl.callsign, fl.airline, fl.origin, fl.destination, fl.aircraft]
          .some((v) => v.toLowerCase().includes(q))
      );
    }
    return f.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "scheduledTime": cmp = new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime(); break;
        case "callsign":      cmp = a.callsign.localeCompare(b.callsign); break;
        case "airline":       cmp = a.airline.localeCompare(b.airline); break;
        case "riskScore":     cmp = a.riskScore - b.riskScore; break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [flights, search, sortField, sortDirection, riskFilters]);

  const getRiskBadge = (level: RiskLevel, score: number) => {
    const pct = (score * 100).toFixed(0);
    const styles: Record<RiskLevel, string> = {
      LOW:    "bg-green-600/20 text-green-400 border-green-500/40",
      MEDIUM: "bg-orange-600/20 text-orange-400 border-orange-500/40",
      HIGH:   "bg-red-600/20 text-red-400 border-red-500/40",
    };
    const labels: Record<RiskLevel, string> = {
      LOW: "Baja", MEDIUM: "Media", HIGH: "Alta",
    };
    return (
      <Badge variant="outline" className={`${styles[level]} font-mono text-xs`}>
        {pct}% {labels[level]}
      </Badge>
    );
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-ES", {
      hour: "2-digit", minute: "2-digit", timeZone: "UTC",
    }) + "Z";

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <Button variant="ghost" size="sm" className="h-8 p-0 font-semibold text-foreground hover:text-foreground"
      onClick={() => handleSort(field)}>
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/50" />
        <Input
          placeholder="Buscar por vuelo, aerolínea, origen, destino..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border text-foreground placeholder:text-foreground/40"
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-border">
                <TableHead className="w-[100px] text-foreground/80">
                  <SortButton field="scheduledTime" label="Prog. (Z)" />
                </TableHead>
                <TableHead className="w-[80px] text-foreground/80 font-semibold">Est. (Z)</TableHead>
                <TableHead className="text-foreground/80">
                  <SortButton field="callsign" label="Vuelo" />
                </TableHead>
                <TableHead className="text-foreground/80">
                  <SortButton field="airline" label="Aerolínea" />
                </TableHead>
                <TableHead className="w-[80px] text-foreground/80 font-semibold">Aeronave</TableHead>
                <TableHead className="w-[90px] text-foreground/80 font-semibold">Matrícula</TableHead>
                <TableHead className="w-[60px] text-foreground/80 font-semibold">Origen</TableHead>
                <TableHead className="w-[60px] text-foreground/80 font-semibold">Destino</TableHead>
                <TableHead className="text-right text-foreground/80">
                  <SortButton field="riskScore" label="Riesgo IA" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-foreground/40">
                      <Plane className="h-8 w-8 mb-2 opacity-50" />
                      <p>No se encontraron vuelos</p>
                      <p className="text-sm">Ajusta los filtros o la búsqueda</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((flight) => (
                  <TableRow key={flight.id} className="hover:bg-muted/20 transition-colors border-border/40">
                    <TableCell className="font-mono text-sm text-foreground">{fmt(flight.scheduledTime)}</TableCell>
                    <TableCell className="font-mono text-sm text-foreground/60">{fmt(flight.estimatedTime)}</TableCell>
                    <TableCell className="font-semibold text-foreground">{flight.callsign}</TableCell>
                    <TableCell className="text-sm text-foreground">{flight.airline}</TableCell>
                    <TableCell className="font-mono text-sm text-foreground">{flight.aircraft}</TableCell>
                    <TableCell className="font-mono text-sm text-foreground/70">{flight.registration}</TableCell>
                    <TableCell className="font-semibold text-foreground">{flight.origin}</TableCell>
                    <TableCell className="font-semibold text-foreground">{flight.destination}</TableCell>
                    <TableCell className="text-right">{getRiskBadge(flight.riskLevel, flight.riskScore)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-foreground/50 px-1">
        <span>Mostrando {rows.length} de {flights.length} vuelos</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {flights.filter((f) => f.riskLevel === "LOW").length} bajo
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            {flights.filter((f) => f.riskLevel === "MEDIUM").length} medio
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {flights.filter((f) => f.riskLevel === "HIGH").length} alto
          </span>
        </div>
      </div>
    </div>
  );
}
