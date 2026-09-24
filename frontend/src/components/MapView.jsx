import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import { fetchIssues, API_ORIGIN, CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS, updateStatus, getAdminKey, setAdminKey } from "../api";

const STATUS_LABELS = {
  pending: "Awaiting review",
  verified: "Verified",
  resolved: "Resolved",
  rejected: "Rejected",
};

export default function MapView() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [adminKeyInput, setAdminKeyInput] = useState(getAdminKey());
  const [error, setError] = useState(null);
  const [loadingError, setLoadingError] = useState(null);

  async function load() {
    setLoading(true);
    setLoadingError(null);
    try {
      const params = {};
      if (filter) params.category = filter;
      if (statusFilter) params.status = statusFilter;
      const data = await fetchIssues(params);
      setIssues(data);
    } catch {
      setLoadingError("We couldn't load reports. Check the connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter, statusFilter]);

  const center = issues.length
    ? [issues[0].lat, issues[0].lng]
    : [19.076, 72.878]; // fallback until real data exists

  async function handleStatusChange(id, status) {
    setError(null);
    try {
      await updateStatus(id, status);
      load();
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Admin key is wrong or not set — enter it below to change statuses."
          : "Status update failed."
      );
    }
  }

  function saveAdminKey() {
    setAdminKey(adminKeyInput.trim());
  }

  return (
    <div>
      {loadingError && (
        <div className="status-banner error">
          {loadingError}{" "}
          <button type="button" className="secondary" onClick={load}>Retry</button>
        </div>
      )}

      <div className="form-group">
        <label>Admin key (only needed to verify/resolve/reject reports)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="password"
            value={adminKeyInput}
            onChange={(e) => setAdminKeyInput(e.target.value)}
            placeholder="Enter admin key"
          />
          <button type="button" className="secondary" onClick={saveAdminKey}>Save</button>
        </div>
      </div>

      {error && <div className="status-banner error">{error}</div>}

      <div className="map-toolbar">
        <div className="form-group">
          <label>Filter by category</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Filter by status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="map-page">
          <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {issues.map((issue) => (
              <CircleMarker
                key={issue.id}
                center={[issue.lat, issue.lng]}
                radius={9}
                pathOptions={{
                  color: issue.flagged ? "#000" : CATEGORY_COLORS[issue.category] || "#666",
                  weight: issue.flagged ? 3 : 1,
                  fillColor: CATEGORY_COLORS[issue.category] || "#666",
                  fillOpacity: 0.8,
                }}
              >
                <Popup>
                  <strong>{CATEGORY_LABELS[issue.category] || issue.category}</strong>
                  <span className={`status-badge status-${issue.status}`}>{STATUS_LABELS[issue.status] || issue.status}</span>
                  <div className={`severity-chip severity-${issue.severity || "medium"}`}>
                    {issue.severity || "medium"} priority
                  </div>
                  {issue.confirmations > 1 && (
                    <span> · confirmed by {issue.confirmations} reports</span>
                  )}
                  {issue.flagged ? (
                    <div style={{ color: "#c0392b", marginTop: 4 }}>
                      ⚠ Flagged for review: {issue.flag_reason}
                    </div>
                  ) : null}
                  <br />
                  {issue.description}
                  {issue.photo_filename && (
                    <>
                      <br />
                      <img src={`${API_ORIGIN}/uploads/${issue.photo_filename}`} alt="" style={{ maxWidth: 180, marginTop: 6 }} />
                    </>
                  )}
                  <br />
                  <select
                    className="status-select"
                    value={issue.status}
                    onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                    style={{ marginTop: 6 }}
                  >
                    <option value="pending">pending</option>
                    <option value="verified">verified</option>
                    <option value="resolved">resolved</option>
                    <option value="rejected">rejected</option>
                  </select>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}
      {!loading && issues.length === 0 && (
        <p style={{ color: "#666", marginTop: 12 }}>No issues reported yet — submit one from the "Report" tab.</p>
      )}
      <div className="map-legend">
        {CATEGORIES.map(({ value, label }) => (
          <span key={value}><i style={{ backgroundColor: CATEGORY_COLORS[value] }} />{label}</span>
        ))}
      </div>
    </div>
  );
}
