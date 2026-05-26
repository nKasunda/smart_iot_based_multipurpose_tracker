const normalizeUrl = (value) => String(value || "").replace(/\/+$/, "");

const getDefaultApiBase = () => {
  if (typeof window === "undefined") return "https://smarttraka.onrender.com";

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:5000";
  }

  return "https://smarttraka.onrender.com";
};

export const API_BASE = normalizeUrl(
  process.env.NEXT_PUBLIC_API_BASE || getDefaultApiBase()
);

export const SOCKET_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_SOCKET_URL || API_BASE
);
