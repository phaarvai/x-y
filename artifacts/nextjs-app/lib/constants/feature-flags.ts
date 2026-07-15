import { env } from "@/lib/config/env";

export const featureFlags = {
  ...env.featureFlags,
  analytics: Boolean(env.analyticsKey) || env.featureFlags.analytics === true,
  storage: Boolean(env.storageUrl) || env.featureFlags.storage === true,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag | string): boolean {
  if (flag in featureFlags) {
    return featureFlags[flag as FeatureFlag] === true;
  }
  return env.featureFlags[flag] === true;
}
