import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import exifr from "exifr";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "../db.js";
import { isWithinGeofence, distanceMeters } from "../geo.js";
import {
  DUPLICATE_RADIUS_METERS,
  DUPLICATE_WINDOW_DAYS,
  AUTO_VERIFY_THRESHOLD,
  EXIF_MISMATCH_METERS,
  ADMIN_KEY,
} from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "..", "uploads"),
    filename: (req, file, cb) => {
      const extensionByType = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
      };
      const ext = extensionByType[file.mimetype] || ".jpg";
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB cap, phone photos are big
  fileFilter: (req, file, cb) => {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, or WebP images are allowed"));
    }
    cb(null, true);
  },
});

// Kills basic bot/spam flooding — 10 submissions per 15 minutes per IP.
// Not bulletproof (VPNs, shared campus IPs) but stops the trivial case for free.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions from this network — slow down and try again shortly." },
});

function requireAdmin(req, res, next) {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Invalid or missing admin key." });
  }
  next();
}

const router = Router();

const VALID_CATEGORIES = ["pothole", "footpath", "drainage", "streetlight", "signage", "other"];
const VALID_SEVERITIES = ["low", "medium", "high", "critical"];
const VALID_STATUSES = ["pending", "verified", "resolved", "rejected"];

// GET /api/issues?category=&status=
router.get("/", (req, res) => {
  const { category, status } = req.query;
  let query = "SELECT * FROM issues";
  const clauses = [];
  const params = [];
  if (category) {
    clauses.push("category = ?");
    params.push(category);
  }
  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (clauses.length) query += " WHERE " + clauses.join(" AND ");
  query += " ORDER BY created_at DESC";
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// GET /api/issues/stats — aggregate counts for the dashboard
router.get("/stats", (req, res) => {
  const byCategory = db
    .prepare("SELECT category, COUNT(*) as count FROM issues GROUP BY category")
    .all();
  const byStatus = db
    .prepare("SELECT status, COUNT(*) as count FROM issues GROUP BY status")
    .all();
  const total = db.prepare("SELECT COUNT(*) as count FROM issues").get().count;
  const flagged = db.prepare("SELECT COUNT(*) as count FROM issues WHERE flagged = 1").get().count;
  res.json({ total, byCategory, byStatus, flagged });
});

// POST /api/issues — multipart form: category, description, lat, lng, reported_by, photo
router.post("/", submitLimiter, upload.single("photo"), async (req, res) => {
  const { category, description, severity = "medium", lat, lng, reported_by } = req.body;
  const cleanup = () => {
    if (req.file) fs.unlink(req.file.path, () => {});
  };

  if (!category || !VALID_CATEGORIES.includes(category)) {
    cleanup();
    return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` });
  }
  if (!description || description.trim().length < 5) {
    cleanup();
    return res.status(400).json({ error: "description must be at least 5 characters" });
  }
  if (!VALID_SEVERITIES.includes(severity)) {
    cleanup();
    return res.status(400).json({ error: `severity must be one of: ${VALID_SEVERITIES.join(", ")}` });
  }
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    cleanup();
    return res.status(400).json({ error: "lat and lng are required and must be numbers" });
  }

  // Geofence: reject anything outside the survey area. Stops randoms submitting
  // from outside your actual project scope.
  if (!isWithinGeofence(latNum, lngNum)) {
    cleanup();
    return res.status(400).json({
      error: "Location is outside the project's survey area. Check the pin placement.",
    });
  }

  // Duplicate corroboration: if the same category was already reported within
  // DUPLICATE_RADIUS_METERS in the last DUPLICATE_WINDOW_DAYS, treat this as a
  // confirmation of the existing report instead of a brand-new one. This turns
  // "many people reporting the same thing" from noise into a trust signal.
  const recentCandidates = db
    .prepare(
      `SELECT * FROM issues
       WHERE category = ?
         AND status != 'rejected'
         AND created_at >= datetime('now', ?)`
    )
    .all(category, `-${DUPLICATE_WINDOW_DAYS} days`);

  const duplicate = recentCandidates.find(
    (issue) => distanceMeters(issue.lat, issue.lng, latNum, lngNum) <= DUPLICATE_RADIUS_METERS
  );

  if (duplicate) {
    cleanup(); // don't keep an orphan photo file for a merged report
    const newConfirmations = duplicate.confirmations + 1;
    const newStatus =
      duplicate.status === "pending" && newConfirmations >= AUTO_VERIFY_THRESHOLD
        ? "verified"
        : duplicate.status;
    db.prepare(
      `UPDATE issues SET confirmations = ?, status = ?, last_confirmed_at = datetime('now') WHERE id = ?`
    ).run(newConfirmations, newStatus, duplicate.id);
    const updated = db.prepare("SELECT * FROM issues WHERE id = ?").get(duplicate.id);
    return res.status(200).json({ ...updated, merged: true });
  }

  // Photo GPS cross-check: if the phone embedded GPS coordinates in the photo
  // and they wildly disagree with the pinned location, flag for manual review.
  // Absence of EXIF GPS is common (many phones strip it) and is NOT flagged —
  // only a genuine mismatch is.
  let flagged = 0;
  let flagReason = null;
  if (req.file) {
    try {
      const gps = await exifr.gps(req.file.path);
      if (gps && gps.latitude != null && gps.longitude != null) {
        const dist = distanceMeters(gps.latitude, gps.longitude, latNum, lngNum);
        if (dist > EXIF_MISMATCH_METERS) {
          flagged = 1;
          flagReason = `Photo's embedded GPS is ~${Math.round(dist / 1000)}km from the pinned location`;
        }
      }
    } catch {
      // Unreadable/corrupt EXIF isn't suspicious by itself — most images have none. Ignore.
    }
  }

  const stmt = db.prepare(`
    INSERT INTO issues (category, description, severity, lat, lng, photo_filename, reported_by, flagged, flag_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    category,
    description.trim(),
    severity,
    latNum,
    lngNum,
    req.file ? req.file.filename : null,
    reported_by || null,
    flagged,
    flagReason
  );

  const created = db.prepare("SELECT * FROM issues WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ ...created, merged: false });
});

// PATCH /api/issues/:id/status — admin verifies/resolves/rejects a report.
// Gated behind the admin key — this used to be wide open, which was the
// biggest actual hole in the system (bigger than fake submissions).
router.patch("/:id/status", requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }
  const result = db.prepare("UPDATE issues SET status = ? WHERE id = ?").run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "issue not found" });
  const updated = db.prepare("SELECT * FROM issues WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// DELETE /api/issues/:id — remove spam/duplicate reports. Also admin-gated.
router.delete("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM issues WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "issue not found" });
  if (existing.photo_filename) {
    fs.unlink(path.join(__dirname, "..", "uploads", existing.photo_filename), () => {});
  }
  db.prepare("DELETE FROM issues WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

export default router;
