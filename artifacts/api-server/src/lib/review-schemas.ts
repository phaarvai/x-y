import { z } from "zod";

export const RATING = z.number().int().min(1).max(5);

export const FEEDBACK_STATUSES = ["PENDING", "PUBLISHED", "HIDDEN", "REJECTED"] as const;
export const REPORT_REASONS = [
  "SPAM",
  "ABUSE",
  "FALSE_INFORMATION",
  "HARASSMENT",
  "OFFENSIVE_CONTENT",
  "OTHER",
] as const;
export const VERIFICATION_ENTITY_TYPES = [
  "USER",
  "MANUFACTURER",
  "MANUFACTURING_FACILITY",
  "VENDOR",
  "LEGAL_PROVIDER",
  "LOGISTICS_PROVIDER",
  "LABOR_SUPPLIER",
  "INVESTOR",
  "MARKET_LEAD",
] as const;
export const VERIFICATION_TYPES = [
  "IDENTITY",
  "BUSINESS",
  "FACILITY",
  "CERTIFICATION",
  "COMPLIANCE",
] as const;
export const VERIFICATION_STATUSES = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "EXPIRED",
  "REVOKED",
] as const;

export const createReviewBody = z.object({
  reviewedUserId: z.number().int().positive().optional(),
  overallRating: RATING,
  qualityRating: RATING,
  communicationRating: RATING,
  timelinessRating: RATING,
  comment: z.string().max(1000).optional().nullable(),
});

export const reportReviewBody = z.object({
  reason: z.enum(REPORT_REASONS),
  description: z.string().max(1000).optional().nullable(),
});

export const moderateReviewBody = z.object({
  notes: z.string().max(2000).optional().nullable(),
});

export const createVerificationBody = z.object({
  entityType: z.enum(VERIFICATION_ENTITY_TYPES),
  entityId: z.number().int().positive(),
  verificationType: z.enum(VERIFICATION_TYPES),
  verificationReason: z.string().max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export const updateVerificationBody = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "REVOKED", "EXPIRED", "PENDING"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  verificationReason: z.string().max(1000).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  action: z.enum(["APPROVE", "REJECT", "REVOKE", "RENEW"]).optional(),
});

export const reviewSettingsBody = z.object({
  moderationEnabled: z.boolean().optional(),
  maxCommentLength: z.number().int().min(100).max(5000).optional(),
});
