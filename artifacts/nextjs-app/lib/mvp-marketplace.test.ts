/**
 * MVP marketplace unit tests
 * Run: node --experimental-strip-types artifacts/nextjs-app/lib/mvp-marketplace.test.ts
 */

import assert from "node:assert/strict";
import { parseLocation, profileCompletion } from "./marketplace-helpers.ts";

console.log("mvp-marketplace tests:");

assert.deepEqual(parseLocation("San Francisco, CA, USA"), {
  city: "San Francisco",
  state: "CA",
  country: "USA",
});

assert.equal(
  profileCompletion({
    name: "A",
    primaryRole: "MANUFACTURER",
    phone: "1",
    organization: "O",
    industry: "X",
    location: "L",
    bio: "B",
  }),
  100,
);

assert.equal(profileCompletion({ name: "A" }), 14);

console.log("mvp-marketplace tests: all passed");
