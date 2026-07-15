/** Run: node artifacts/api-server/src/lib/review-math.test.mjs */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function calculateAverages(reviews) {
  const count = reviews.length;
  if (!count) {
    return { average: 0, quality: 0, communication: 0, timeliness: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let o = 0, q = 0, c = 0, t = 0;
  for (const r of reviews) {
    if (r.overall < 1 || r.overall > 5) throw new Error("Invalid rating");
    o += r.overall;
    q += r.quality;
    c += r.communication;
    t += r.timeliness;
    dist[r.overall] += 1;
  }
  return {
    average: round2(o / count),
    quality: round2(q / count),
    communication: round2(c / count),
    timeliness: round2(t / count),
    distribution: dist,
  };
}

function canReview({ bookingStatus, reviewerId, reviewedId, alreadyReviewed, isParticipant }) {
  if (bookingStatus !== "COMPLETED") return false;
  if (!isParticipant) return false;
  if (reviewerId === reviewedId) return false;
  if (alreadyReviewed) return false;
  return true;
}

function isBadgeVisible({ status, expiresAt }, now = Date.now()) {
  if (status !== "VERIFIED") return false;
  if (expiresAt && new Date(expiresAt).getTime() < now) return false;
  return true;
}

const avg = calculateAverages([
  { overall: 5, quality: 5, communication: 4, timeliness: 5 },
  { overall: 3, quality: 3, communication: 3, timeliness: 3 },
]);
assert(avg.average === 4, "average 4");
assert(avg.distribution[5] === 1 && avg.distribution[3] === 1, "distribution");

assert(canReview({ bookingStatus: "COMPLETED", reviewerId: 1, reviewedId: 2, alreadyReviewed: false, isParticipant: true }), "allowed");
assert(!canReview({ bookingStatus: "CONFIRMED", reviewerId: 1, reviewedId: 2, alreadyReviewed: false, isParticipant: true }), "not completed");
assert(!canReview({ bookingStatus: "COMPLETED", reviewerId: 1, reviewedId: 1, alreadyReviewed: false, isParticipant: true }), "self review");
assert(!canReview({ bookingStatus: "COMPLETED", reviewerId: 1, reviewedId: 2, alreadyReviewed: true, isParticipant: true }), "duplicate");

assert(isBadgeVisible({ status: "VERIFIED", expiresAt: null }), "verified no expiry");
assert(!isBadgeVisible({ status: "REVOKED", expiresAt: null }), "revoked hidden");
assert(!isBadgeVisible({ status: "VERIFIED", expiresAt: "2020-01-01" }), "expired hidden");

console.log("review-math tests passed");
