import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
export const API_ORIGIN = configuredApiUrl || "";
const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

export const CATEGORIES = [
  { value: "pothole", label: "Pothole" },
  { value: "footpath", label: "Damaged Footpath" },
  { value: "drainage", label: "Drainage / Water Leakage" },
  { value: "streetlight", label: "Non-functional Streetlight" },
  { value: "signage", label: "Inadequate Signage" },
  { value: "other", label: "Other" },
];

export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map(({ value, label }) => [value, label])
);

export const SEVERITIES = [
  { value: "low", label: "Low - cosmetic or minor" },
  { value: "medium", label: "Medium - should be addressed" },
  { value: "high", label: "High - safety or access concern" },
  { value: "critical", label: "Critical - immediate danger" },
];

export const CATEGORY_COLORS = {
  pothole: "#e63946",
  footpath: "#f4a261",
  drainage: "#457b9d",
  streetlight: "#e9c46a",
  signage: "#2a9d8f",
  other: "#6c757d",
};

export async function fetchIssues(params = {}) {
  const { data } = await api.get("/issues", { params });
  return data;
}

export async function fetchStats() {
  const { data } = await api.get("/issues/stats");
  return data;
}

export async function submitIssue(formData) {
  const { data } = await api.post("/issues", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateStatus(id, status) {
  const { data } = await api.patch(
    `/issues/${id}/status`,
    { status },
    { headers: { "x-admin-key": getAdminKey() } }
  );
  return data;
}

// Admin key is just a shared secret typed once and kept in this browser's
// localStorage — not a real login. Enough to stop randoms on the public map
// from flipping statuses; not meant to resist a determined attacker.
const ADMIN_KEY_STORAGE = "civictrack_admin_key";

export function getAdminKey() {
  return localStorage.getItem(ADMIN_KEY_STORAGE) || "";
}

export function setAdminKey(key) {
  localStorage.setItem(ADMIN_KEY_STORAGE, key);
}

export default api;
