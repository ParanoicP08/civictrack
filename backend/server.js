import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import issuesRouter from "./routes/issues.js";
import db from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.size === 0 || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CivicTrack CORS policy."));
  },
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/issues", issuesRouter);

app.get("/api/health", (req, res) => {
  try {
    db.prepare("SELECT 1").get();
    res.json({ ok: true, service: "civictrack-api", database: "ok" });
  } catch {
    res.status(503).json({ ok: false, service: "civictrack-api", database: "unavailable" });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Request body contains invalid JSON." });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Photo must be 8MB or smaller." });
  }
  if (err.message === "Only JPEG, PNG, or WebP images are allowed") {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`CivicTrack backend running on http://localhost:${PORT}`);
});
