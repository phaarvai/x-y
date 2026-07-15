import { z } from "zod";

export const SERVICE_PROVIDER_TYPES = [
  "VENDOR",
  "LABOR_SUPPLIER",
  "LOGISTICS_PROVIDER",
  "LEGAL_AUDITOR",
  "INVESTOR",
  "MARKET_LEAD",
] as const;

export const PROVIDER_TYPE_ROLES: Record<string, string[]> = {
  VENDOR: ["VENDOR"],
  LABOR_SUPPLIER: ["LABOR_SUPPLIER"],
  LOGISTICS_PROVIDER: ["LOGISTICS_PROVIDER"],
  LEGAL_AUDITOR: ["LEGAL_AUDITOR", "AUDITOR", "PLATFORM_ADMIN"],
  INVESTOR: ["INVESTOR"],
  MARKET_LEAD: ["MARKET_LEAD"],
};

export const WORKER_CATEGORIES = [
  "SKILLED",
  "SEMI_SKILLED",
  "UNSKILLED",
  "TECHNICAL",
  "MACHINE_OPERATORS",
  "WELDERS",
  "ELECTRICIANS",
  "FABRICATORS",
  "SUPERVISORS",
  "QUALITY_INSPECTORS",
] as const;

export const LOGISTICS_SERVICE_TYPES = [
  "LOCAL",
  "OUTSTATION",
  "INTERNATIONAL",
  "WAREHOUSING",
  "COLD_STORAGE",
  "FREIGHT",
  "EXPRESS_DELIVERY",
] as const;

export const createProviderBody = z.object({
  providerType: z.enum(SERVICE_PROVIDER_TYPES),
  companyName: z.string().min(2).max(255),
  displayName: z.string().min(2).max(255),
  serviceCategories: z.string().max(2000).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  businessType: z.string().max(128).optional().nullable(),
  experienceYears: z.number().int().min(0).max(80).optional(),
  certifications: z.string().max(2000).optional().nullable(),
  licenses: z.string().max(2000).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  serviceableAreas: z.string().max(2000).optional().nullable(),
  pricingModel: z.string().max(64).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(32).optional().nullable(),
  website: z.string().max(255).optional().nullable(),
  socialLinks: z.string().max(2000).optional().nullable(),
  profileImage: z.string().max(2000).optional().nullable(),
});

export const updateProviderBody = createProviderBody.partial().omit({ providerType: true });

export const createMaterialBody = z.object({
  materialName: z.string().min(2).max(255),
  category: z.string().min(2).max(128),
  subCategory: z.string().max(128).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  unit: z.string().max(32).optional(),
  minimumOrderQuantity: z.union([z.string(), z.number()]).optional().nullable(),
  availableQuantity: z.union([z.string(), z.number()]).optional().nullable(),
  unitPrice: z.union([z.string(), z.number()]).refine((v) => Number(v) >= 0),
  currency: z.string().length(3).optional(),
  leadTime: z.string().max(64).optional().nullable(),
  availabilityStatus: z.enum(["AVAILABLE", "LIMITED", "OUT_OF_STOCK"]).optional(),
  location: z.string().max(255).optional().nullable(),
  deliveryOptions: z.string().max(1000).optional().nullable(),
  images: z.string().max(4000).optional().nullable(),
  specifications: z.string().max(4000).optional().nullable(),
});

export const createLaborBody = z.object({
  workerType: z.enum(WORKER_CATEGORIES),
  skillCategory: z.string().min(2).max(128),
  experienceLevel: z.string().max(64).optional().nullable(),
  workerCount: z.number().int().min(1).max(10000).optional(),
  availability: z.string().max(64).optional(),
  availabilityCalendar: z.string().max(5000).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  dailyRate: z.union([z.string(), z.number()]).optional().nullable(),
  monthlyRate: z.union([z.string(), z.number()]).optional().nullable(),
  currency: z.string().length(3).optional(),
  description: z.string().max(5000).optional().nullable(),
});

export const createLogisticsBody = z.object({
  serviceType: z.enum(LOGISTICS_SERVICE_TYPES),
  vehicleType: z.string().max(64).optional().nullable(),
  storageType: z.string().max(64).optional().nullable(),
  capacity: z.string().max(128).optional().nullable(),
  coverageAreas: z.string().max(2000).optional().nullable(),
  pricingModel: z.string().max(64).optional().nullable(),
  minimumCharge: z.union([z.string(), z.number()]).optional().nullable(),
  currency: z.string().length(3).optional(),
  estimatedDelivery: z.string().max(128).optional().nullable(),
  insuranceAvailable: z.boolean().optional(),
  trackingAvailable: z.boolean().optional(),
  description: z.string().max(5000).optional().nullable(),
});

export const createQuoteBody = z.object({
  serviceId: z.number().int().positive().optional().nullable(),
  providerId: z.number().int().positive(),
  requestId: z.number().int().positive().optional().nullable(),
  pickupLocation: z.string().max(255).optional().nullable(),
  dropLocation: z.string().max(255).optional().nullable(),
  cargoDetails: z.string().max(2000).optional().nullable(),
  requestedDate: z.string().optional().nullable(),
});

export const respondQuoteBody = z.object({
  quotedAmount: z.union([z.string(), z.number()]),
  providerResponse: z.string().max(2000).optional().nullable(),
  currency: z.string().length(3).optional(),
  status: z.enum(["QUOTED", "DECLINED", "ACCEPTED"]).optional(),
});

export const investorProfileBody = z.object({
  investmentInterests: z.string().max(2000).optional().nullable(),
  preferredIndustries: z.string().max(2000).optional().nullable(),
  ticketSizeMinimum: z.union([z.string(), z.number()]).optional().nullable(),
  ticketSizeMaximum: z.union([z.string(), z.number()]).optional().nullable(),
  preferredGeographies: z.string().max(2000).optional().nullable(),
  investmentStages: z.string().max(1000).optional().nullable(),
  portfolioWebsite: z.string().max(255).optional().nullable(),
  bio: z.string().max(5000).optional().nullable(),
});

export const projectInvestmentBody = z.object({
  projectId: z.number().int().positive(),
  title: z.string().max(255).optional().nullable(),
  isOpenForInvestment: z.boolean().optional(),
  minimumInvestment: z.union([z.string(), z.number()]).optional().nullable(),
  maximumInvestment: z.union([z.string(), z.number()]).optional().nullable(),
  equityOffered: z.union([z.string(), z.number()]).optional().nullable(),
  fundingGoal: z.union([z.string(), z.number()]).optional().nullable(),
  publicSummary: z.string().max(5000).optional().nullable(),
  confidentialNotes: z.string().max(5000).optional().nullable(),
});

export const investmentInterestBody = z.object({
  notes: z.string().max(2000).optional().nullable(),
});

export const investmentRequestPatchBody = z.object({
  status: z.enum(["APPROVED", "REJECTED", "ACCEPTED"]),
  ownerNotes: z.string().max(2000).optional().nullable(),
});

export const marketOpportunityBody = z.object({
  title: z.string().min(2).max(255),
  productCategory: z.string().min(2).max(128),
  description: z.string().max(5000).optional().nullable(),
  demandVolume: z.union([z.string(), z.number()]).optional().nullable(),
  unit: z.string().max(32).optional().nullable(),
  geography: z.string().max(255).optional().nullable(),
  timeline: z.string().max(128).optional().nullable(),
  targetPrice: z.union([z.string(), z.number()]).optional().nullable(),
  currency: z.string().length(3).optional(),
  contactRules: z.string().max(2000).optional().nullable(),
});

export const interestBody = z.object({
  message: z.string().max(2000).optional().nullable(),
});

export const inquiryBody = z.object({
  message: z.string().min(2).max(2000),
  materialId: z.number().int().positive().optional(),
  listingId: z.number().int().positive().optional(),
});

export function canCreateProviderType(role: string | null, providerType: string, isAdmin: boolean) {
  if (isAdmin) return true;
  if (!role) return false;
  const allowed = PROVIDER_TYPE_ROLES[providerType] || [];
  return allowed.includes(role) || role === providerType;
}
