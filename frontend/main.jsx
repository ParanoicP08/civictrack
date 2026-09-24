* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: #f5f5f5;
  color: #1a1a1a;
}

.app-shell {
  max-width: 900px;
  margin: 0 auto;
  min-height: 100vh;
  background: white;
  box-shadow: 0 0 20px rgba(0,0,0,0.05);
}

header.app-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

header.app-header h1 {
  margin: 0 0 4px;
  font-size: 20px;
}

header.app-header p {
  margin: 0;
  color: #666;
  font-size: 13px;
}

nav.tabs {
  display: flex;
  border-bottom: 1px solid #eee;
}

nav.tabs button {
  flex: 1;
  padding: 12px;
  border: none;
  background: none;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  color: #666;
}

nav.tabs button.active {
  color: #1a1a1a;
  border-bottom-color: #2a9d8f;
  font-weight: 600;
}

main {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}

.form-group textarea { resize: vertical; min-height: 70px; }

button.primary {
  background: #2a9d8f;
  color: white;
  border: none;
  padding: 12px 18px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

button.primary:disabled { opacity: 0.5; cursor: not-allowed; }

button.secondary {
  background: white;
  color: #2a9d8f;
  border: 1px solid #2a9d8f;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.location-picker {
  height: 260px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
  border: 1px solid #ccc;
}

.status-banner {
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 16px;
}

.status-banner.success { background: #e6f4ea; color: #1e7e34; }
.status-banner.error { background: #fdecea; color: #c0392b; }

.map-page { height: 500px; border-radius: 6px; overflow: hidden; }

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 14px;
  text-align: center;
}

.stat-card .num { font-size: 26px; font-weight: 700; }
.stat-card .label { font-size: 12px; color: #666; text-transform: uppercase; }

.issue-list { list-style: none; padding: 0; }

.issue-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  color: white;
  text-transform: capitalize;
}

.status-select {
  font-size: 12px;
  padding: 4px 6px;
}
