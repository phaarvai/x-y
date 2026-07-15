export interface Machine {
  id: number;
  name: string;
  subtitle: string;
  qty: number;
  pricePerHour: number;
  specs?: {
    workEnvelope?: string;
    spindleSpeed?: string;
    toolCapacity?: string;
    materials?: string;
  };
}

export interface Manufacturer {
  id: number;
  name: string;
  tagline: string;
  location: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  instantBook: boolean;
  priceRange: string;
  priceMin: number;
  priceMax: number;
  distance: string;
  certifications: string[];
  availableMachines: string[];
  availability: string;
  availabilityStatus: "green" | "yellow" | "red";
  openSlots: number;
  nextAvailable: string;
  leadTime: string;
  responseTime: string;
  stats: { projectsCompleted: number; activeClients: number; avgResponseTime: string; successRate: string };
  about: string;
  contact: { email: string; phone: string; website: string };
  capabilities: string[];
  certificationDetails: { name: string; org: string; year: number }[];
  machinery: Machine[];
}

export const manufacturers: Manufacturer[] = [
  {
    id: 1,
    name: "PrecisionTech Manufacturing",
    tagline: "Precision Engineering for the Future",
    location: "San Francisco, CA, USA",
    rating: 4.8,
    reviewCount: 124,
    verified: true,
    instantBook: true,
    priceRange: "$120–$180/hr",
    priceMin: 120,
    priceMax: 180,
    distance: "5 miles away",
    certifications: ["ISO 9001", "AS9100"],
    availableMachines: ["CNC Milling", "3D Printing", "Laser Cutting"],
    availability: "Available Now",
    availabilityStatus: "green",
    openSlots: 12,
    nextAvailable: "Today",
    leadTime: "Same day",
    responseTime: "< 30 min",
    stats: { projectsCompleted: 1247, activeClients: 89, avgResponseTime: "< 2 hrs", successRate: "98%" },
    about: "PrecisionTech Manufacturing is a leading provider of precision machining and rapid prototyping services. With over 15 years of experience, we specialize in CNC milling, 3D printing, and custom manufacturing solutions.",
    contact: { email: "contact@precisiontech.com", phone: "+1 (415) 555-0123", website: "www.precisiontech.com" },
    capabilities: ["CNC Milling & Turning", "3D Printing (SLS, FDM, SLA)", "Laser Cutting & Engraving", "Injection Molding", "Sheet Metal Fabrication", "Welding & Assembly", "Surface Finishing", "Quality Inspection"],
    certificationDetails: [
      { name: "ISO 9001:2015", org: "International Organization for Standardization", year: 2023 },
      { name: "AS9100D", org: "Aerospace Quality Management", year: 2022 },
      { name: "RoHS Compliant", org: "EU Directive", year: 2023 },
    ],
    machinery: [
      { id: 1, name: "CNC Milling Machine", subtitle: "5-Axis CNC • Qty: 5", qty: 5, pricePerHour: 150, specs: { workEnvelope: '40" x 20" x 20"', spindleSpeed: "Up to 12,000 RPM", toolCapacity: "24 tools", materials: "Aluminum, Steel, Titanium, Plastics" } },
      { id: 2, name: "3D Printer - Industrial", subtitle: "SLS/FDM • Qty: 3", qty: 3, pricePerHour: 120 },
      { id: 3, name: "Laser Cutting System", subtitle: "Fiber Laser • Qty: 2", qty: 2, pricePerHour: 180 },
    ],
  },
  {
    id: 2,
    name: "GlobalFab Industries",
    tagline: "Global Manufacturing Solutions",
    location: "Austin, TX, USA",
    rating: 4.9,
    reviewCount: 98,
    verified: true,
    instantBook: false,
    priceRange: "$150–$220/hr",
    priceMin: 150,
    priceMax: 220,
    distance: "850 miles away",
    certifications: ["ISO 9001", "RoHS"],
    availableMachines: ["Injection Molding", "CNC Lathe", "Assembly"],
    availability: "Available in 2 days",
    availabilityStatus: "yellow",
    openSlots: 8,
    nextAvailable: "May 6",
    leadTime: "2–3 days",
    responseTime: "< 2 hours",
    stats: { projectsCompleted: 843, activeClients: 61, avgResponseTime: "< 4 hrs", successRate: "96%" },
    about: "GlobalFab Industries is a full-service contract manufacturer specializing in high-volume injection molding and CNC machining for automotive and consumer electronics industries.",
    contact: { email: "hello@globalfab.com", phone: "+1 (512) 555-0188", website: "www.globalfab.com" },
    capabilities: ["Injection Molding", "CNC Lathe & Turning", "Assembly & Kitting", "Sheet Metal Work", "Welding", "Quality Inspection"],
    certificationDetails: [
      { name: "ISO 9001:2015", org: "International Organization for Standardization", year: 2022 },
      { name: "RoHS Compliant", org: "EU Directive", year: 2023 },
    ],
    machinery: [
      { id: 1, name: "Injection Molding Press", subtitle: "500T Clamp • Qty: 4", qty: 4, pricePerHour: 200 },
      { id: 2, name: "CNC Lathe", subtitle: "Multi-axis • Qty: 6", qty: 6, pricePerHour: 165 },
      { id: 3, name: "Assembly Station", subtitle: "Clean Room • Qty: 3", qty: 3, pricePerHour: 150 },
    ],
  },
  {
    id: 3,
    name: "QuickProto Solutions",
    tagline: "Fast Prototyping at Scale",
    location: "Seattle, WA, USA",
    rating: 4.7,
    reviewCount: 156,
    verified: true,
    instantBook: true,
    priceRange: "$100–$150/hr",
    priceMin: 100,
    priceMax: 150,
    distance: "680 miles away",
    certifications: ["ISO 9001"],
    availableMachines: ["3D Printing", "Rapid Prototyping", "Finishing"],
    availability: "Available Now",
    availabilityStatus: "green",
    openSlots: 15,
    nextAvailable: "Today",
    leadTime: "Same day",
    responseTime: "< 30 min",
    stats: { projectsCompleted: 2104, activeClients: 145, avgResponseTime: "< 1 hr", successRate: "99%" },
    about: "QuickProto Solutions is the fastest-growing rapid prototyping service in the Pacific Northwest. We specialize in turning ideas into physical prototypes within 24–48 hours.",
    contact: { email: "info@quickproto.com", phone: "+1 (206) 555-0242", website: "www.quickproto.com" },
    capabilities: ["FDM 3D Printing", "Resin Printing", "SLS Nylon", "Vacuum Casting", "CNC Routing", "Surface Finishing"],
    certificationDetails: [
      { name: "ISO 9001:2015", org: "International Organization for Standardization", year: 2023 },
    ],
    machinery: [
      { id: 1, name: "FDM Printer Farm", subtitle: "Large Format • Qty: 20", qty: 20, pricePerHour: 100 },
      { id: 2, name: "Resin Printer", subtitle: "High-Res • Qty: 8", qty: 8, pricePerHour: 130 },
      { id: 3, name: "SLS System", subtitle: "Nylon PA12 • Qty: 2", qty: 2, pricePerHour: 150 },
    ],
  },
];

export const TIME_SLOTS = [
  { id: 1, start: "9:00 AM", end: "12:00 PM", hours: 3, pricePerHour: 150, booked: false },
  { id: 2, start: "1:00 PM", end: "5:00 PM", hours: 4, pricePerHour: 150, booked: false },
  { id: 3, start: "6:00 PM", end: "10:00 PM", hours: 4, pricePerHour: 180, booked: true },
];
