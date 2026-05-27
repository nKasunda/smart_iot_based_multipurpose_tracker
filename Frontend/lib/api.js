import axios from "axios";
import { API_BASE } from "./config";
import { getToken } from "./tokenStorage";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function login(email, password) {
  const res = await api.post("/api/auth/login", { email, password });
  return res.data;
}

export async function googleLogin(idToken) {
  const res = await api.post("/api/auth/google", { idToken });
  return res.data;
}

export async function register(name, email, password) {
  const res = await api.post("/api/auth/register", { name, email, password });
  return res.data;
}

export async function verifyEmail(token) {
  const res = await api.post("/api/auth/verify-email", { token });
  return res.data;
}

export async function resendVerification(email) {
  const res = await api.post("/api/auth/resend-verification", { email });
  return res.data;
}

export async function forgotPassword(email) {
  const res = await api.post("/api/auth/forgot-password", { email });
  return res.data;
}

export async function me() {
  const res = await api.get("/api/auth/me");
  return res.data;
}

export async function getDevices() {
  const res = await api.get("/api/tracker/devices");
  return res.data;
}

export async function registerDevice({ device_id, type, userId }) {
  const payload = { device_id, type };
  if (userId !== undefined) payload.userId = userId;
  const res = await api.post("/api/tracker/devices", payload);
  return res.data;
}

export async function getLatest() {
  const res = await api.get("/api/tracker/latest");
  return res.data;
}

export async function getStats() {
  const res = await api.get("/api/tracker/stats");
  return res.data;
}

export async function getAlerts() {
  const res = await api.get("/api/tracker/alerts");
  return res.data;
}

export async function updateProfile(payload) {
  const res = await api.patch("/api/user/profile", payload);
  return res.data;
}

export async function updatePassword(payload) {
  const res = await api.patch("/api/user/password", payload);
  return res.data;
}

export async function updateSettings(payload) {
  const res = await api.patch("/api/user/settings", payload);
  return res.data;
}

export async function getHistory({ device_id, from, to, limit }) {
  const params = { device_id };
  if (from) params.from = from;
  if (to) params.to = to;
  if (limit) params.limit = limit;
  const res = await api.get("/api/tracker/history", { params });
  return res.data;
}
