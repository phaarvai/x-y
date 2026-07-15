/**
 * Persona workflow helper tests
 * Run: node --experimental-strip-types artifacts/nextjs-app/lib/persona-workflows.test.ts
 */

import assert from "node:assert/strict";
import { parseLocation, parsePageLimit, profileCompletion } from "./marketplace-helpers.ts";

console.log("persona-workflows tests:");

assert.deepEqual(parsePageLimit(new URLSearchParams("page=2&limit=10")), {
  page: 2,
  limit: 10,
  offset: 10,
});

assert.deepEqual(parsePageLimit(new URLSearchParams("page=0&limit=999")), {
  page: 1,
  limit: 50,
  offset: 0,
});

assert.deepEqual(parseLocation("Pune, MH, India"), {
  city: "Pune",
  state: "MH",
  country: "India",
});

assert.ok(profileCompletion({ name: "A", primaryRole: "VISIONARY" }) > 0);

console.log("persona-workflows tests: all passed");
