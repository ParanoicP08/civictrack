import { useEffect, useState } from "react";
import { CATEGORIES, SEVERITIES, submitIssue } from "../api";
import LocationPicker from "./LocationPicker";

const initialState = {
  category: "pothole",
  severity: "medium",
  description: "",
  reported_by: "",
  lat: null,
  lng: null,
  accuracy: null,
};

export default function SubmitForm({ onSubmitted }) {
  const [form, setForm] = useState(initialState);
  const [photo, setPhoto] = useState(null);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg }
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submittedIssue, setSubmittedIssue] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(photo);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function useMyLocation() {
    if (form.lat != null && form.lng != null) {
      setStatus({ type: "success", msg: "Your current location is already selected. Tap the map if you want to change it." });
      return;
    }
    if (!navigator.geolocation) {
      setStatus({ type: "error", msg: "Geolocation not supported on this device — drop a pin on the map instead." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("lat", pos.coords.latitude);
        update("lng", pos.coords.longitude);
        update("accuracy", pos.coords.accuracy);
        setStatus({ type: "success", msg: "Current location selected. You can tap the map to adjust the pin." });
        setLocating(false);
      },
      () => {
        setStatus({ type: "error", msg: "Couldn't get GPS location — drop a pin on the map instead." });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function resetLocation() {
    setForm((current) => ({ ...current, lat: null, lng: null, accuracy: null }));
    setStatus({ type: "success", msg: "Location cleared. Select your current location or tap the map again." });
  }

  function handlePhotoChange(event) {
    const selectedPhoto = event.target.files?.[0] ?? null;
    if (selectedPhoto && selectedPhoto.size > 8 * 1024 * 1024) {
      setPhoto(null);
      event.target.value = "";
      setStatus({ type: "error", msg: "Photo must be 8MB or smaller." });
      return;
    }
    setPhoto(selectedPhoto);
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
    fd.append("severity", form.severity);
    fd.append("lat", form.lat);
    fd.append("lng", form.lng);
    if (form.reported_by.trim()) fd.append("reported_by", form.reported_by.trim());
    if (photo) fd.append("photo", photo);

    setSubmitting(true);
    try {
      const created = await submitIssue(fd);
      setSubmittedIssue(created);
      setStatus(null);
      setForm({ ...initialState });
      setPhoto(null);
      onSubmitted?.(created);
    } catch (err) {
      setStatus({ type: "error", msg: err.response?.data?.error || "Submission failed — is the backend running?" });
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedIssue) {
    return (
      <section className="success-card" aria-live="polite">
        <div className="success-icon" aria-hidden="true">✓</div>
        <h2>Report submitted successfully</h2>
        <p>
          {submittedIssue.merged
            ? "Your report confirmed an existing issue nearby."
            : "Thank you for helping improve your community."}
        </p>
        <div className="success-details">
          <strong>Issue #{submittedIssue.id}</strong>
          <span>Status: {submittedIssue.status || "pending"}</span>
          <span>Priority: {submittedIssue.severity || "medium"}</span>
        </div>
        <button type="button" className="primary" onClick={() => setSubmittedIssue(null)}>
          Submit another report
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {status && <div className={`status-banner ${status.type}`} role={status.type === "error" ? "alert" : "status"} aria-live="polite">{status.msg}</div>}

      <div className="form-section">
        <div className="section-heading"><span>1</span><div><h2>Describe the issue</h2><p>Tell us what needs attention.</p></div></div>
      <div className="form-group">
        <label htmlFor="issue-category">Issue category <span className="required-mark">*</span></label>
        <select id="issue-category" value={form.category} onChange={(e) => update("category", e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="issue-severity">Priority <span className="required-mark">*</span></label>
        <select id="issue-severity" value={form.severity} onChange={(e) => update("severity", e.target.value)}>
          {SEVERITIES.map((severity) => (
            <option key={severity.value} value={severity.value}>{severity.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="issue-description">Description <span className="required-mark">*</span></label>
        <textarea
          id="issue-description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What did you observe? Be specific — size, severity, how long it's been there."
          maxLength={1000}
        />
        <small className="field-help">{form.description.length}/1000 characters</small>
      </div>
      </div>

      <div className="form-section">
        <div className="section-heading"><span>2</span><div><h2>Set the location</h2><p>Use GPS or tap the map to place the pin.</p></div></div>
      <div className="form-group">
        <label>Location {form.lat != null && form.lng != null ? "selected" : "not set"} <span className="required-mark">*</span></label>
        <div className="location-actions">
        <button type="button" className="secondary" onClick={useMyLocation} disabled={locating} style={{ marginBottom: 8 }}>
          {locating ? "Getting GPS location…" : form.lat != null && form.lng != null ? "Location already selected" : "Use my current location"}
        </button>
        {form.lat != null && form.lng != null && <button type="button" className="text-button" onClick={resetLocation}>Change location</button>}
        </div>
        {form.lat != null && form.lng != null && <small className="location-confirmation">✓ Location selected{form.accuracy ? ` (within about ${Math.round(form.accuracy)}m)` : ""}</small>}
        <LocationPicker lat={form.lat} lng={form.lng} onChange={(lat, lng) => { update("lat", lat); update("lng", lng); update("accuracy", null); setStatus({ type: "success", msg: "Map location updated." }); }} />
        <small className="field-help">You can drag the map or tap anywhere to correct the pin.</small>
      </div>
      </div>

      <div className="form-section">
        <div className="section-heading"><span>3</span><div><h2>Add evidence</h2><p>A photo helps the municipality verify the issue faster.</p></div></div>
      <div className="form-group">
        <label htmlFor="issue-photo">Photo <span className="optional-label">(optional)</span></label>
        <input id="issue-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handlePhotoChange} />
        <small className="field-help">JPEG, PNG or WebP · maximum 8MB</small>
        {photoPreview && <div className="photo-preview"><img src={photoPreview} alt="Selected report preview" /><button type="button" className="text-button" onClick={() => setPhoto(null)}>Remove photo</button></div>}
      </div>

      <div className="form-group">
        <label htmlFor="reported-by">Your name <span className="optional-label">(optional)</span></label>
        <input id="reported-by" type="text" value={form.reported_by} onChange={(e) => update("reported_by", e.target.value)} placeholder="For internal tracking only" maxLength={100} />
      </div>
      </div>

      <button type="submit" className="primary submit-button" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
