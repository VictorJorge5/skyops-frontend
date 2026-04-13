// lib/keep-alive.ts
// Llama a la API de Render cada 14 minutos para que no se duerma.
// Importa esto en tu layout.tsx o page.tsx raíz.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://skyops-api.onrender.com";
const INTERVAL = 14 * 60 * 1000; // 14 minutos

let started = false;

export function startKeepAlive() {
  if (typeof window === "undefined") return; // solo en cliente
  if (started) return;
  started = true;

  const ping = () => {
    fetch(`${API_URL}/health`, { cache: "no-store" })
      .then(() => console.log("🟢 Keep-alive ping OK"))
      .catch(() => console.log("🔴 Keep-alive ping failed"));
  };

  ping(); // ping inmediato al cargar
  setInterval(ping, INTERVAL);
}
