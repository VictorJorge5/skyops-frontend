"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
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

const RadarMap = dynamic(
  () => import("@/components/dashboard/radar-map").then((m) => m.RadarMap),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-border bg-card h-[500px] lg:h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando radar...</p>
        </div>
      </div>
    ),
  }
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://skyops-api.onrender.com";

export default function Dashboard() {
  const [airport, setAirport] = useState<string>("ALL");
  const [hours, setHours] = useState(15);
  const [riskFilters, setRiskFilters] = useState<RiskLevel[]>(["LOW", "MEDIUM", "HIGH"]);
  const [selAirlines, setSelAirlines] = useState<string[]>([]);
  const [selFlights, setSelFlights] = useState<string[]>([]);

  // Keep-alive: ping a Render cada 14 min para que no se duerma
  useEffect(() => {
    const ping = () =>
      fetch(`${API_URL}/health`, { cache: "no-store" }).catch(() => {});
    ping();
    const id = setInterval(ping, 14 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const {
    inAir, arrivals, departures,
    weatherData, airlineDistribution, hourlyLoad,
    metar, taf,
    isLoading, isRefreshing, error, lastUpdated, refresh,
  } = useDashboardData(airport, hours);

  const aptName = useMemo(
    () => airport === "ALL" ? "Estados Unidos (Global)" : AIRPORTS[airport as AirportCode]?.name || airport,
    [airport]
  );

  const wx = useMemo(
    () => weatherData.length > 0
      ? { wind: Math.round(weatherData[0].wind), gusts: Math.round(weatherData[0].gusts) }
      : { wind: 0, gusts: 0 },
    [weatherData]
  );

  const avAirlines = useMemo(() => {
    const s = new Set<string>();
    [...arrivals, ...departures, ...inAir].forEach((f) => {
      if (f.airline && f.airline !== "N/A") s.add(f.airline);
    });
    return Array.from(s).sort();
  }, [inAir, arrivals, departures]);

  const avFlights = useMemo(() => {
    const s = new Set<string>();
    [...arrivals, ...departures, ...inAir].forEach((f) => {
      if (f.callsign && f.callsign !== "N/A") s.add(f.callsign);
    });
    return Array.from(s).sort();
  }, [inAir, arrivals, departures]);

  const filter = useCallback(
    (flights: typeof inAir) =>
      flights.filter((f) => {
        if (!riskFilters.includes(f.riskLevel)) return false;
        if (selAirlines.length > 0 && !selAirlines.includes(f.airline)) return false;
        if (selFlights.length > 0 && !selFlights.includes(f.callsign)) return false;
        return true;
      }),
    [riskFilters, selAirlines, selFlights]
  );

  const fInAir = useMemo(() => filter(inAir),      [filter, inAir]);
  const fArr   = useMemo(() => filter(arrivals),   [filter, arrivals]);
  const fDep   = useMemo(() => filter(departures), [filter, departures]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SidebarFilters
        selectedAirport={airport}
        onAirportChange={setAirport}
        forecastHours={hours}
        onForecastHoursChange={setHours}
        riskFilters={riskFilters}
        onRiskFilterChange={setRiskFilters}
        airlines={avAirlines}
        selectedAirlines={selAirlines}
        onAirlinesChange={setSelAirlines}
        flightNumbers={avFlights}
        selectedFlightNumbers={selFlights}
        onFlightNumbersChange={setSelFlights}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header airportName={aptName} flightCount={inAir.length} />

        {(error || isRefreshing || lastUpdated) && (
          <div className={`px-6 py-1.5 text-xs flex items-center gap-2 border-b border-border/40 ${
            error ? "bg-chart-4/5 text-chart-4" : "bg-muted/30 text-muted-foreground"
          }`}>
            {error ? (
              <><WifiOff className="h-3 w-3" />{error}</>
            ) : isRefreshing ? (
              <><RefreshCw className="h-3 w-3 animate-spin" />Actualizando datos en vivo...</>
            ) : lastUpdated ? (
              <><Wifi className="h-3 w-3 text-chart-2" />
                Datos en vivo &middot; Ultima actualizacion: {lastUpdated.toLocaleTimeString("es-ES", { timeZone: "UTC" })} UTC
              </>
            ) : null}
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <KPICards
            radarCount={fInAir.length}
            arrivalsCount={fArr.length}
            departuresCount={fDep.length}
            airportsCount={airport === "ALL" ? Object.keys(AIRPORTS).length : 1}
            currentWind={airport !== "ALL" ? wx.wind : undefined}
            currentGusts={airport !== "ALL" ? wx.gusts : undefined}
            selectedAirport={airport !== "ALL" ? airport : undefined}
            isLoading={isLoading}
          />

          <Tabs defaultValue="radar" className="space-y-4">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="radar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                <Map className="h-4 w-4" />Radar en Vivo
              </TabsTrigger>
              <TabsTrigger value="arrivals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                <PlaneLanding className="h-4 w-4" />Llegadas
                {fArr.length > 0 && (
                  <span className="ml-1 bg-primary/20 text-primary text-[10px] font-mono px-1.5 py-0.5 rounded-full">
                    {fArr.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="departures" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                <PlaneTakeoff className="h-4 w-4" />Salidas
                {fDep.length > 0 && (
                  <span className="ml-1 bg-primary/20 text-primary text-[10px] font-mono px-1.5 py-0.5 rounded-full">
                    {fDep.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                <BarChart3 className="h-4 w-4" />Dashboard Analitico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="radar" className="space-y-4">
              {isLoading ? (
                <div className="rounded-lg border border-border bg-card h-[500px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm">Conectando con FlightRadar24...</p>
                    <p className="text-muted-foreground/50 text-xs mt-1">Primera carga puede tardar ~30s</p>
                  </div>
                </div>
              ) : (
                <RadarMap flights={fInAir} selectedAirport={airport} riskFilters={riskFilters} weatherData={weatherData} />
              )}
              <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-chart-2 animate-pulse" />
                  Radar Activo: {fInAir.length} aviones &middot; {fArr.length} llegadas &middot; {fDep.length} salidas
                </span>
                <span className="text-xs">Datos: FlightRadar24 + IA</span>
              </div>
            </TabsContent>

            <TabsContent value="arrivals">
              {isLoading ? <Spinner /> : <FlightsTable flights={fArr} type="arrivals" riskFilters={riskFilters} />}
            </TabsContent>

            <TabsContent value="departures">
              {isLoading ? <Spinner /> : <FlightsTable flights={fDep} type="departures" riskFilters={riskFilters} />}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {airport === "ALL" ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-chart-3 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Selecciona un aeropuerto especifico</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Para ver graficos detallados selecciona un aeropuerto en el panel lateral.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid lg:grid-cols-2 gap-4">
                    <WindChart data={weatherData} airport={airport} />
                    <PrecipChart data={weatherData} airport={airport} />
                  </div>
                  <div className="grid lg:grid-cols-2 gap-4">
                    <AirlineDistributionChart data={airlineDistribution} airport={airport} hours={hours} />
                    <HourlyLoadChart data={hourlyLoad} airport={airport} hours={hours} />
                  </div>
                  {metar && taf && <MetarTafDisplay airport={airport} metar={metar} taf={taf} />}
                </>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">Cargando vuelos en vivo...</p>
    </div>
  );
}
