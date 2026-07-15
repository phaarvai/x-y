/** Run: node artifacts/api-server/src/lib/commission-math.test.mjs */

export function computeCommissionAmount(amount, type, rate) {
  if (!(amount > 0)) throw new Error("Amount must be positive");
  const round2 = (n) => Math.round(n * 100) / 100;
  return type === "FLAT" ? round2(rate) : round2((amount * rate) / 100);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(computeCommissionAmount(1000, "PERCENTAGE", 10) === 100, "10% of 1000");
assert(computeCommissionAmount(1000, "FLAT", 50) === 50, "flat 50");
assert(computeCommissionAmount(99.99, "PERCENTAGE", 18) === 18, "18% of 99.99 rounded");

try {
  computeCommissionAmount(0, "PERCENTAGE", 10);
  throw new Error("should have thrown");
} catch (e) {
  assert(e.message === "Amount must be positive", "zero amount rejected");
}

console.log("commission-math tests passed");
