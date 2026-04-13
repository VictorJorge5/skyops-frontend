"use client";
import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AIRPORTS, type AirportCode, type Flight, type RiskLevel } from "@/lib/mock-data";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW:    "#3fb950",
  MEDIUM: "#e3b341",
  HIGH:   "#f85149",
};

const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: "Baja", MEDIUM: "Media", HIGH: "Alta",
};

function planeIcon(risk: RiskLevel, heading: number) {
  return L.divIcon({
    className: "",
    html: `<div style="transform:rotate(${heading}deg);color:${RISK_COLORS[risk]};filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6));display:flex;align-items:center;justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

const airportIcon = L.divIcon({
  className: "",
  html: `<div style="background:rgba(13,17,23,0.95);border:2px solid #388bfd;border-radius:8px;padding:5px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.5);">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#388bfd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h18"/>
    </svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useMemo(() => map.setView(center, zoom, { animate: true }), [map, center, zoom]);
  return null;
}

// Componente popup con carga de foto asíncrona
function FlightPopup({ flight }: { flight: Flight }) {
  const [photo, setPhoto] = useState<{ src: string; link: string; photographer: string } | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(true);

  useEffect(() => {
    if (!flight.registration || flight.registration === "N/A") {
      setLoadingPhoto(false);
      return;
    }
    fetch(`https://api.planespotters.net/pub/photos/reg/${flight.registration}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.photos?.length > 0) {
          const p = data.photos[0];
          setPhoto({
            src: p.thumbnail_large?.src || p.thumbnail?.src,
            link: p.link,
            photographer: p.photographer,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPhoto(false));
  }, [flight.registration]);

  const vs = flight.verticalSpeed;
  const vsColor = vs > 0 ? "#3fb950" : vs < 0 ? "#f85149" : "#8b949e";
  const vsStr = vs > 0 ? `+${vs}` : `${vs}`;
  const riskColor = RISK_COLORS[flight.riskLevel];

  return (
    <div style={{ width: 260, fontFamily: "system-ui, sans-serif", fontSize: 12, color: "#e6edf3" }}>

      {/* Foto o placeholder */}
      <div style={{ width: "100%", height: 130, background: "#161b22", position: "relative", overflow: "hidden", borderRadius: "0" }}>
        {loadingPhoto ? (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#484f58", fontSize: 11 }}>
            Cargando imagen...
          </div>
        ) : photo ? (
          <>
            <a href={photo.link} target="_blank" rel="noreferrer">
              <img src={photo.src} alt={flight.aircraft} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </a>
            <div style={{ position: "absolute", bottom: 4, right: 6, fontSize: 9, color: "rgba(255,255,255,0.6)" }}>
              © {photo.photographer} · Planespotters.net
            </div>
          </>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "#484f58" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#388bfd" opacity="0.4">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
            <a href={`https://www.jetphotos.com/registration/${flight.registration}`} target="_blank" rel="noreferrer"
              style={{ fontSize: 10, color: "#388bfd", textDecoration: "none" }}>
              Buscar en JetPhotos →
            </a>
          </div>
        )}
        {/* Overlay con callsign y riesgo */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.8))", padding: "16px 10px 6px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: riskColor }}>✈ {flight.callsign}</span>
          <span style={{ background: `${riskColor}22`, border: `1px solid ${riskColor}55`, borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 600, color: riskColor, fontFamily: "monospace" }}>
            {Math.round(flight.riskScore * 100)}% {RISK_LABELS[flight.riskLevel]}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: "10px 12px", background: "#0d1117" }}>

        {/* Aerolínea y matrícula */}
        <div style={{ color: "#8b949e", fontSize: 11, marginBottom: 8 }}>
          {flight.airline} · <span style={{ fontFamily: "monospace" }}>{flight.registration}</span> · {flight.aircraft}
        </div>

        {/* Ruta */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
          <span style={{ color: "#e6edf3" }}>{flight.origin}</span>
          <span style={{ color: "#388bfd" }}>→</span>
          <span style={{ color: "#e6edf3" }}>{flight.destination}</span>
        </div>

        <div style={{ height: 1, background: "#21262d", margin: "8px 0" }} />

        {/* Datos técnicos */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", marginBottom: 8 }}>
          <div><span style={{ color: "#8b949e" }}>Altitud: </span><span style={{ fontFamily: "monospace" }}>{flight.altitude.toLocaleString()} ft</span></div>
          <div><span style={{ color: "#8b949e" }}>Velocidad: </span><span style={{ fontFamily: "monospace" }}>{flight.speed} kts</span></div>
          <div><span style={{ color: "#8b949e" }}>Rumbo: </span><span style={{ fontFamily: "monospace" }}>{flight.heading}°</span></div>
          <div><span style={{ color: "#8b949e" }}>V/S: </span><span style={{ fontFamily: "monospace", color: vsColor }}>{vsStr} fpm</span></div>
        </div>

        <div style={{ height: 1, background: "#21262d", margin: "8px 0" }} />

        {/* Predicción IA */}
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "#8b949e" }}>Riesgo IA: </span>
          <span style={{ color: riskColor, fontWeight: 700 }}>
            {Math.round(flight.riskScore * 100)}% — {RISK_LABELS[flight.riskLevel]}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div><span style={{ color: "#8b949e" }}>Viento dest.: </span><span style={{ fontFamily: "monospace" }}>{flight.windAtDest} kts</span></div>
          <div><span style={{ color: "#8b949e" }}>Lluvia: </span><span style={{ fontFamily: "monospace" }}>{flight.precipAtDest.toFixed(1)} mm</span></div>
        </div>

        {/* ETA */}
        {flight.eta && (
          <div style={{ marginTop: 6, color: "#8b949e", fontSize: 11 }}>
            ETA: <span style={{ fontFamily: "monospace", color: "#e6edf3" }}>
              {new Date(flight.eta).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}Z
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface RadarMapProps {
  flights: Flight[];
  selectedAirport: string;
  riskFilters?: RiskLevel[];
  weatherData: { direction: number; wind: number }[];
}

export function RadarMap({ flights, selectedAirport, weatherData }: RadarMapProps) {
  const [selFlight, setSelFlight] = useState<Flight | null>(null);

  const center = useMemo((): [number, number] =>
    selectedAirport !== "ALL" && AIRPORTS[selectedAirport as AirportCode]
      ? AIRPORTS[selectedAirport as AirportCode].coords as [number, number]
      : [39.5, -98.35],
    [selectedAirport]
  );

  const zoom = selectedAirport === "ALL" ? 4 : 6;

  const apts = useMemo(() =>
    selectedAirport === "ALL"
      ? (Object.keys(AIRPORTS) as AirportCode[])
      : [selectedAirport as AirportCode],
    [selectedAirport]
  );

  const wind = weatherData.length > 0
    ? { direction: weatherData[0].direction, wind: Math.round(weatherData[0].wind) }
    : { direction: 270, wind: 12 };

  const visibleFlights = flights.filter((f) => f.latitude !== 0 && f.longitude !== 0);

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="h-[500px] lg:h-[600px] relative">
        <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
          <MapUpdater center={center} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Marcadores de aeropuertos */}
          {apts.map((code) => (
            <Marker key={code} position={AIRPORTS[code].coords as [number, number]} icon={airportIcon}>
              <Popup>
                <div style={{ minWidth: 180, fontFamily: "system-ui", fontSize: 13, color: "#e6edf3", background: "#0d1117", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: "#388bfd" }}>{AIRPORTS[code].name}</div>
                  <div style={{ color: "#8b949e", fontSize: 11, marginBottom: 6 }}>{AIRPORTS[code].icao} / {code}</div>
                  <div style={{ color: "#e6edf3" }}>Viento: {wind.wind} kts @ {wind.direction}°</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Marcadores de vuelos */}
          {visibleFlights.map((f) => (
            <Marker
              key={f.id}
              position={[f.latitude, f.longitude]}
              icon={planeIcon(f.riskLevel, f.heading)}
              eventHandlers={{ click: () => setSelFlight(f) }}
            >
              <Popup maxWidth={280} minWidth={260}>
                <FlightPopup flight={f} />
              </Popup>
            </Marker>
          ))}

          {/* Línea de ruta del vuelo seleccionado */}
          {selFlight && AIRPORTS[selFlight.destination as AirportCode] && (
            <Polyline
              positions={[
                [selFlight.latitude, selFlight.longitude],
                AIRPORTS[selFlight.destination as AirportCode].coords as [number, number],
              ]}
              pathOptions={{ color: "#388bfd", weight: 2, dashArray: "6, 10", opacity: 0.7 }}
            />
          )}
        </MapContainer>

        {/* Leyenda */}
        <div style={{ position: "absolute", bottom: 16, left: 16, zIndex: 1000, background: "rgba(13,17,23,0.92)", border: "1px solid #30363d", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontWeight: 600, marginBottom: 7, color: "#e6edf3", fontSize: 12 }}>Leyenda</div>
          {(["LOW", "MEDIUM", "HIGH"] as RiskLevel[]).map((l) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, color: "#8b949e", fontSize: 11 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: RISK_COLORS[l], display: "inline-block", flexShrink: 0 }} />
              {l === "LOW" ? "Riesgo Bajo" : l === "MEDIUM" ? "Riesgo Medio" : "Riesgo Alto"}
            </div>
          ))}
        </div>

        {/* Contador */}
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 1000, background: "rgba(13,17,23,0.92)", border: "1px solid #30363d", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "#e6edf3", fontSize: 12 }}>Radar Activo</div>
          <div style={{ color: "#8b949e", fontSize: 11 }}>{visibleFlights.length} aviones en seguimiento</div>
        </div>
      </div>
    </div>
  );
}
