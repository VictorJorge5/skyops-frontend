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
