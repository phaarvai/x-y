import { z } from "zod";
import {
  PROVIDER_TYPES,
  CONTRACT_CATEGORIES,
  DISPUTE_CATEGORIES,
  DISPUTE_STATUSES,
} from "./auth";

export const createLegalProviderBody = z.object({
  providerType: z.enum(PROVIDER_TYPES as unknown as [string, ...string[]]),
  businessName: z.string().min(2).max(255),
  displayName: z.string().min(2).max(255),
  bio: z.string().max(5000).optional().nullable(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  qualifications: z.string().max(2000).optional().nullable(),
  licenses: z.string().max(2000).optional().nullable(),
  certifications: z.string().max(2000).optional().nullable(),
  serviceCategories: z.string().max(2000).optional().nullable(),
  languages: z.string().max(500).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  serviceRadius: z.number().int().min(0).max(5000).optional().nullable(),
  pricingType: z.enum(["HOURLY", "FIXED", "HYBRID"]).optional(),
  hourlyRate: z.union([z.string(), z.number()]).optional().nullable(),
  fixedPrice: z.union([z.string(), z.number()]).optional().nullable(),
  currency: z.string().length(3).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  linkedin: z.string().url().optional().nullable().or(z.literal("")),
  profileImage: z.string().max(2000).optional().nullable(),
  credentialsUrl: z.string().max(2000).optional().nullable(),
});

export const updateLegalProviderBody = createLegalProviderBody.partial();

export const createTemplateBody = z.object({
  title: z.string().min(2).max(255),
  category: z.enum(CONTRACT_CATEGORIES as unknown as [string, ...string[]]),
  description: z.string().max(2000).optional().nullable(),
  templateContent: z.string().min(10),
  language: z.string().max(10).optional(),
  changeLog: z.string().max(1000).optional().nullable(),
});

export const updateTemplateBody = z.object({
  title: z.string().min(2).max(255).optional(),
  category: z.enum(CONTRACT_CATEGORIES as unknown as [string, ...string[]]).optional(),
  description: z.string().max(2000).optional().nullable(),
  templateContent: z.string().min(10).optional(),
  language: z.string().max(10).optional(),
  changeLog: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const attachLegalDocumentBody = z.object({
  templateId: z.number().int().positive().optional().nullable(),
  documentTitle: z.string().min(2).max(255),
  documentUrl: z.string().max(2000).optional().nullable(),
  documentContent: z.string().optional().nullable(),
  requiresAcceptance: z.boolean().optional(),
  requiredPartyRoles: z.string().max(255).optional(),
  version: z.number().int().positive().optional(),
});

export const acceptAgreementBody = z.object({
  digitalSignature: z.string().min(2).max(255),
  accepted: z.literal(true),
});

export const createDisputeBody = z.object({
  againstUser: z.number().int().positive().optional().nullable(),
  category: z.enum(DISPUTE_CATEGORIES as unknown as [string, ...string[]]),
  reason: z.string().min(2).max(255),
  description: z.string().min(10).max(5000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
});

export const updateDisputeBody = z.object({
  category: z.enum(DISPUTE_CATEGORIES as unknown as [string, ...string[]]).optional(),
  reason: z.string().min(2).max(255).optional(),
  description: z.string().min(10).max(5000).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  resolutionNotes: z.string().max(5000).optional().nullable(),
  againstUser: z.number().int().positive().optional().nullable(),
});

export const updateDisputeStatusBody = z.object({
  status: z.enum(DISPUTE_STATUSES as unknown as [string, ...string[]]),
  resolutionNotes: z.string().max(5000).optional().nullable(),
});

export const closeDisputeBody = z.object({
  resolutionNotes: z.string().min(2).max(5000),
});

export const disputeEvidenceBody = z.object({
  fileUrl: z.string().min(1).max(2000),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(128),
});

export const createBookingStubBody = z.object({
  manufacturerUserId: z.number().int().positive(),
  facilityId: z.number().int().positive().optional().nullable(),
  inventoryId: z.number().int().positive().optional().nullable(),
  agreedPrice: z.union([z.string(), z.number()]).optional().nullable(),
  currency: z.string().length(3).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const setRoleBody = z.object({
  primaryRole: z.string().min(2).max(64),
});
