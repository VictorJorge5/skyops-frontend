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
