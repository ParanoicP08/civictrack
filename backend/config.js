// Tune these once you've locked in your actual survey locality (the CEP proposal
// still has "Mumbai, Maharashtra" as a placeholder — narrow this box once that's fixed).
// Currently set generously to cover the whole Mumbai Metropolitan Region so it
// doesn't reject real submissions before you've picked an exact neighbourhood.
export const GEOFENCE = {
  minLat: 18.85,
  maxLat: 19.35,
  minLng: 72.70,
  maxLng: 73.30,
};

// Two reports of the same category within this radius, within this many days,
// are treated as the same real-world issue rather than two separate ones.
export const DUPLICATE_RADIUS_METERS = 40;
export const DUPLICATE_WINDOW_DAYS = 14;

// A pending report auto-promotes to "verified" once this many independent
// people have reported the same spot — crowd corroboration standing in for
// a human moderator you don't have staffed 24/7.
export const AUTO_VERIFY_THRESHOLD = 3;

// If a photo's embedded GPS EXIF data disagrees with the pinned location by
// more than this, flag it for manual review. Many phones strip GPS EXIF by
// default, so absence of EXIF data is NOT itself suspicious — only a clear
// mismatch is.
export const EXIF_MISMATCH_METERS = 1000;

// Shared secret required to change an issue's status or delete it. This is
// deliberately simple (one shared key, not real user accounts) — enough to
// stop randoms from the public map flipping statuses, not meant to survive
// a determined attacker. Set a real value via the ADMIN_KEY environment
// variable before this ever runs anywhere but localhost.
const configuredAdminKey = process.env.ADMIN_KEY?.trim();

if (process.env.NODE_ENV === "production" && !configuredAdminKey) {
  throw new Error("ADMIN_KEY must be set before starting CivicTrack in production.");
}

if (!configuredAdminKey) {
  console.warn("ADMIN_KEY is not set; using a local-development key only.");
}

export const ADMIN_KEY = configuredAdminKey || "civic123";
