import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { fetchStats, CATEGORY_COLORS } from "../api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setError(null);
    setStats(null);
    fetchStats()
      .then(setStats)
      .catch(() => setError("Couldn't load dashboard data — is the backend running?"));
  }

  useEffect(() => { load(); }, []);

  if (error) {
    return (
      <div>
        <div className="status-banner error">{error}</div>
        <button type="button" className="secondary" onClick={load}>Retry</button>
      </div>
    );
  }

  if (!stats) return <p>Loading…</p>;

  const byStatusMap = Object.fromEntries(stats.byStatus.map((s) => [s.status, s.count]));
  const barData = stats.byCategory.map((c) => ({ category: c.category, count: c.count }));

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="num">{stats.total}</div>
          <div className="label">Total reports</div>
        </div>
        <div className="stat-card">
          <div className="num">{byStatusMap.pending || 0}</div>
          <div className="label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="num">{byStatusMap.verified || 0}</div>
          <div className="label">Verified</div>
        </div>
        <div className="stat-card">
          <div className="num">{byStatusMap.resolved || 0}</div>
          <div className="label">Resolved</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.flagged}</div>
          <div className="label">Flagged</div>
        </div>
      </div>

      {stats.total === 0 ? (
        <p style={{ color: "#666" }}>No data yet. Charts will populate once field reports come in.</p>
      ) : (
        <>
          <h3 style={{ fontSize: 14, color: "#333" }}>Issues by category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData}>
              <XAxis dataKey="category" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count">
                {barData.map((entry) => (
                  <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || "#666"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <h3 style={{ fontSize: 14, color: "#333", marginTop: 24 }}>Status breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={stats.byStatus} dataKey="count" nameKey="status" outerRadius={80} label>
                {stats.byStatus.map((entry, i) => (
                  <Cell key={entry.status} fill={["#e9c46a", "#2a9d8f", "#457b9d"][i % 3]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
