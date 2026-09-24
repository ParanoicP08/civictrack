import { useState } from "react";
import { CATEGORIES, submitIssue } from "../api";
import LocationPicker from "./LocationPicker";

const initialState = {
  category: "pothole",
  description: "",
  reported_by: "",
  lat: null,
  lng: null,
};

export default function SubmitForm({ onSubmitted }) {
  const [form, setForm] = useState(initialState);
  const [photo, setPhoto] = useState(null);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg }
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setStatus({ type: "error", msg: "Geolocation not supported on this device — drop a pin on the map instead." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("lat", pos.coords.latitude);
        update("lng", pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setStatus({ type: "error", msg: "Couldn't get GPS location — drop a pin on the map instead." });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);

    if (form.lat == null || form.lng == null) {
      setStatus({ type: "error", msg: "Set a location — use GPS or tap the map." });
      return;
    }
    if (form.description.trim().length < 5) {
      setStatus({ type: "error", msg: "Description needs at least 5 characters." });
      return;
    }

    const fd = new FormData();
    fd.append("category", form.category);
    fd.append("description", form.description.trim());
    fd.append("lat", form.lat);
    fd.append("lng", form.lng);
    if (form.reported_by.trim()) fd.append("reported_by", form.reported_by.trim());
    if (photo) fd.append("photo", photo);

    setSubmitting(true);
    try {
      const created = await submitIssue(fd);
      setStatus(
        created.merged
          ? { type: "success", msg: `Someone nearby already reported this (issue #${created.id}) — logged your report as a confirmation instead of a duplicate.` }
          : { type: "success", msg: `Reported. Issue #${created.id} logged.` }
      );
      setForm(initialState);
      setPhoto(null);
      onSubmitted?.(created);
    } catch (err) {
      setStatus({ type: "error", msg: err.response?.data?.error || "Submission failed — is the backend running?" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {status && <div className={`status-banner ${status.type}`}>{status.msg}</div>}

      <div className="form-group">
        <label>Issue category</label>
        <select value={form.category} onChange={(e) => update("category", e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What did you observe? Be specific — size, severity, how long it's been there."
        />
      </div>

      <div className="form-group">
        <label>Location {form.lat && form.lng ? `(${form.lat.toFixed(5)}, ${form.lng.toFixed(5)})` : "(not set)"}</label>
        <button type="button" className="secondary" onClick={useMyLocation} disabled={locating} style={{ marginBottom: 8 }}>
          {locating ? "Getting GPS location…" : "Use my current location"}
        </button>
        <LocationPicker lat={form.lat} lng={form.lng} onChange={(lat, lng) => { update("lat", lat); update("lng", lng); }} />
        <small style={{ color: "#666" }}>Or tap the map to place/correct the pin manually.</small>
      </div>

      <div className="form-group">
        <label>Photo (optional)</label>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      </div>

      <div className="form-group">
        <label>Your name (optional)</label>
        <input type="text" value={form.reported_by} onChange={(e) => update("reported_by", e.target.value)} placeholder="For internal tracking only" />
      </div>

      <button type="submit" className="primary" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
