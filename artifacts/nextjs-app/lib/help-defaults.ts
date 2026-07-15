/** Default tooltip/help content & onboarding checklists for EPIC 16 */

export const DEFAULT_HELP_CONTENT: {
  page: string;
  fieldKey: string;
  title: string;
  helpText: string;
  tooltipText: string;
  example?: string;
}[] = [
  {
    page: "registration",
    fieldKey: "name",
    title: "Full name",
    helpText: "Enter the name you want partners to see on X!Y.",
    tooltipText: "Use your business contact name or legal name.",
    example: "Priya Sharma",
  },
  {
    page: "registration",
    fieldKey: "email",
    title: "Work email",
    helpText: "We’ll send verification and booking updates here.",
    tooltipText: "Prefer a company domain email when possible.",
    example: "you@company.com",
  },
  {
    page: "registration",
    fieldKey: "password",
    title: "Password",
    helpText: "Use at least 8 characters. Don’t reuse passwords from other sites.",
    tooltipText: "Strong passwords mix letters, numbers, and symbols.",
  },
  {
    page: "registration",
    fieldKey: "primaryRole",
    title: "Your role",
    helpText: "Choose how you’ll use X!Y. You can refine your profile later.",
    tooltipText: "Manufacturers supply capacity; Visionaries source production.",
  },
  {
    page: "manufacturer_profile",
    fieldKey: "industry",
    title: "Industry",
    helpText: "Primary manufacturing sector helps Visionaries discover you.",
    tooltipText: "Pick the closest match; add specialties in the description.",
    example: "Automotive components",
  },
  {
    page: "facility_profile",
    fieldKey: "location",
    title: "Facility location",
    helpText: "City / region where production happens.",
    tooltipText: "Accurate location improves matching and logistics quotes.",
    example: "Pune, Maharashtra",
  },
  {
    page: "machinery_listing",
    fieldKey: "machineType",
    title: "Machine type",
    helpText: "Describe the equipment available for booking.",
    tooltipText: "Include make/model when possible.",
    example: "CNC Vertical Machining Center",
  },
  {
    page: "availability",
    fieldKey: "capacity",
    title: "Capacity",
    helpText: "Weekly or monthly available capacity for new jobs.",
    tooltipText: "Keep this current to avoid overbooking.",
  },
  {
    page: "pricing",
    fieldKey: "rate",
    title: "Rate",
    helpText: "Base rate Visionaries will see before negotiation.",
    tooltipText: "Currency defaults to INR unless changed.",
    example: "1500",
  },
  {
    page: "visionary_requirement",
    fieldKey: "title",
    title: "Requirement title",
    helpText: "A short label for your manufacturing need.",
    tooltipText: "Be specific so the right manufacturers respond.",
    example: "Injection molded enclosure — 5k units",
  },
  {
    page: "vendor_listing",
    fieldKey: "materialName",
    title: "Material name",
    helpText: "What raw material or component you supply.",
    example: "ABS Granules (Virgin)",
  },
  {
    page: "labor_listing",
    fieldKey: "skillCategory",
    title: "Skill category",
    helpText: "Primary skill set offered by your workforce.",
    example: "Welders / Fitters",
  },
  {
    page: "logistics_service",
    fieldKey: "serviceType",
    title: "Service type",
    helpText: "Transport, warehousing, or last-mile delivery.",
    example: "FTL road freight",
  },
  {
    page: "legal_provider",
    fieldKey: "providerType",
    title: "Provider type",
    helpText: "Your legal/compliance specialty on the marketplace.",
  },
  {
    page: "investor_profile",
    fieldKey: "thesis",
    title: "Investment thesis",
    helpText: "Sectors and ticket sizes you consider. Do not solicit illegally.",
    tooltipText: "X!Y does not provide investment advice.",
  },
  {
    page: "market_opportunity",
    fieldKey: "productCategory",
    title: "Product category",
    helpText: "Category of demand or opportunity you are sharing.",
  },
  {
    page: "booking",
    fieldKey: "notes",
    title: "Booking notes",
    helpText: "Share quality, delivery, or compliance expectations.",
  },
  {
    page: "payment",
    fieldKey: "amount",
    title: "Payment amount",
    helpText: "Confirm currency and platform fees before paying.",
  },
  {
    page: "review",
    fieldKey: "overallRating",
    title: "Overall rating",
    helpText: "Rate the completed booking honestly. Reviews may be moderated.",
    tooltipText: "1 = poor, 5 = excellent",
  },
];

export const TEMPLATE_CATEGORIES = [
  "MANUFACTURING_FACILITY",
  "MACHINERY",
  "VENDOR",
  "LABOR",
  "LOGISTICS",
  "LEGAL_PROVIDER",
  "INVESTOR",
  "MARKET_OPPORTUNITY",
  "VISIONARY_REQUIREMENT",
] as const;

export const DEFAULT_TEMPLATES: {
  name: string;
  industry: string;
  category: (typeof TEMPLATE_CATEGORIES)[number];
  description: string;
  templateData: Record<string, unknown>;
}[] = [
  {
    name: "Precision CNC Facility",
    industry: "Metal fabrication",
    category: "MANUFACTURING_FACILITY",
    description: "Example facility listing for a mid-size CNC shop.",
    templateData: {
      name: "Precision CNC Works",
      location: "Chennai, Tamil Nadu",
      capabilities: ["CNC milling", "Turning", "QA inspection"],
      certifications: ["ISO 9001"],
    },
  },
  {
    name: "3-Axis CNC Machine",
    industry: "Metal fabrication",
    category: "MACHINERY",
    description: "Sample machinery listing.",
    templateData: {
      machineType: "3-Axis VMC",
      make: "HAAS",
      model: "VF-2",
      hourlyRate: "1800",
      currency: "INR",
    },
  },
  {
    name: "Polymer Resin Vendor",
    industry: "Plastics",
    category: "VENDOR",
    description: "Sample raw material listing.",
    templateData: {
      materialName: "ABS Virgin Granules",
      unit: "KG",
      unitPrice: "145",
      minOrder: "500",
    },
  },
  {
    name: "Skilled Welders Crew",
    industry: "Fabrication",
    category: "LABOR",
    description: "Labor supply listing example.",
    templateData: {
      workerType: "Contract",
      skillCategory: "TIG/MIG Welders",
      workerCount: 8,
      dailyRate: "1200",
    },
  },
  {
    name: "Regional FTL Logistics",
    industry: "Logistics",
    category: "LOGISTICS",
    description: "Logistics service template.",
    templateData: {
      serviceType: "FTL",
      vehicleType: "32 ft container",
      coverageAreas: ["MH", "GJ", "KA"],
    },
  },
  {
    name: "Corporate Counsel Profile",
    industry: "Legal",
    category: "LEGAL_PROVIDER",
    description: "Legal provider profile starter.",
    templateData: {
      providerType: "CORPORATE_LAWYER",
      displayName: "Corporate Counsel Desk",
      pricingType: "HOURLY",
    },
  },
  {
    name: "Deep-tech Angel Profile",
    industry: "Investment",
    category: "INVESTOR",
    description: "Investor introduction profile (not advice).",
    templateData: {
      thesis: "Early manufacturing & climate tech",
      ticketMin: "2500000",
      ticketMax: "15000000",
    },
  },
  {
    name: "Export Demand Lead",
    industry: "Consumer goods",
    category: "MARKET_OPPORTUNITY",
    description: "Market opportunity listing example.",
    templateData: {
      title: "EU buyer seeking stainless cookware OEM",
      productCategory: "Kitchenware",
      volume: "20k units / year",
    },
  },
  {
    name: "Pilot Production Requirement",
    industry: "Electronics",
    category: "VISIONARY_REQUIREMENT",
    description: "Visionary requirement template.",
    templateData: {
      title: "PCB assembly pilot — 2k boards",
      category: "Electronics",
      budgetMax: "500000",
      city: "Bengaluru",
    },
  },
];

export type OnboardingStep = { id: string; label: string; href: string };

export const ONBOARDING_BY_ROLE: Record<string, OnboardingStep[]> = {
  MANUFACTURER: [
    { id: "profile", label: "Complete manufacturer profile", href: "/dashboard/manufacturer" },
    { id: "facility", label: "Add facility details", href: "/dashboard/manufacturer" },
    { id: "machinery", label: "List machinery or capacity", href: "/templates?category=MACHINERY" },
    { id: "availability", label: "Set availability", href: "/dashboard/manufacturer" },
    { id: "verify", label: "Submit verification", href: "/dashboard/manufacturer" },
  ],
  VISIONARY: [
    { id: "profile", label: "Complete visionary profile", href: "/dashboard/visionary" },
    { id: "requirement", label: "Post first requirement", href: "/templates?category=VISIONARY_REQUIREMENT" },
    { id: "browse", label: "Browse manufacturers", href: "/browse" },
    { id: "request", label: "Send a request", href: "/dashboard/visionary" },
    { id: "payment", label: "Set up payments", href: "/dashboard/payments" },
  ],
  VENDOR: [
    { id: "profile", label: "Create vendor profile", href: "/dashboard/provider" },
    { id: "listing", label: "Publish a material listing", href: "/templates?category=VENDOR" },
    { id: "inquiry", label: "Respond to inquiries", href: "/dashboard/provider" },
  ],
  LABOR_SUPPLIER: [
    { id: "profile", label: "Create labor profile", href: "/dashboard/provider" },
    { id: "listing", label: "Publish labor listing", href: "/templates?category=LABOR" },
    { id: "rates", label: "Set rates & availability", href: "/dashboard/provider" },
  ],
  LOGISTICS_PROVIDER: [
    { id: "profile", label: "Create logistics profile", href: "/dashboard/provider" },
    { id: "service", label: "Publish a service", href: "/templates?category=LOGISTICS" },
    { id: "quotes", label: "Respond to quote requests", href: "/dashboard/provider" },
  ],
  LEGAL_WRITER: [
    { id: "profile", label: "Complete legal provider profile", href: "/legal/dashboard" },
    { id: "publish", label: "Publish your profile", href: "/legal/dashboard" },
    { id: "services", label: "List service categories", href: "/legal/dashboard" },
  ],
  INVESTOR: [
    { id: "profile", label: "Complete investor profile", href: "/dashboard/provider" },
    { id: "thesis", label: "Describe investment focus", href: "/templates?category=INVESTOR" },
  ],
  MARKET_LEAD: [
    { id: "profile", label: "Complete market lead profile", href: "/dashboard/provider" },
    { id: "opportunity", label: "Publish an opportunity", href: "/templates?category=MARKET_OPPORTUNITY" },
  ],
};

// Alias legal suite roles to LEGAL_WRITER steps
for (const r of [
  "CORPORATE_LAWYER",
  "COMPLIANCE_CONSULTANT",
  "AUDITOR",
  "CHARTERED_ACCOUNTANT",
  "TAX_CONSULTANT",
  "COMPANY_SECRETARY",
  "INTELLECTUAL_PROPERTY_CONSULTANT",
  "LEGAL_AUDITOR",
]) {
  ONBOARDING_BY_ROLE[r] = ONBOARDING_BY_ROLE.LEGAL_WRITER;
}

export const HELP_ARTICLE_CATEGORIES = [
  "Getting Started",
  "Account",
  "Listings",
  "Bookings",
  "Payments",
  "Messaging",
  "Subscriptions",
  "Reviews",
  "Disputes",
  "Legal",
  "Analytics",
  "Security",
  "Troubleshooting",
] as const;

export const HELP_ROLES = [
  "GENERAL",
  "MANUFACTURER",
  "VISIONARY",
  "VENDOR",
  "LABOR_SUPPLIER",
  "LOGISTICS_PROVIDER",
  "LEGAL_PROVIDER",
  "INVESTOR",
  "MARKET_LEAD",
  "ADMINISTRATOR",
] as const;

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}
