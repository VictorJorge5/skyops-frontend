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
