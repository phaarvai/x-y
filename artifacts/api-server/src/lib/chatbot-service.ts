/**
 * EPIC 16 — ChatbotService
 * Rule-based intent matching. Does NOT give legal/financial/investment advice.
 */

export type ChatIntent =
  | "GENERAL_FAQ"
  | "PLATFORM_NAVIGATION"
  | "FEATURE_GUIDANCE"
  | "TROUBLESHOOTING"
  | "ESCALATION"
  | "LEGAL_DISCLAIMER"
  | "HELP_CENTER";

export type ChatbotReply = {
  intent: ChatIntent;
  message: string;
  suggestions: string[];
  quickReplies: string[];
  escalate: boolean;
  links: { label: string; href: string }[];
  disclaimer?: string;
};

const ADVICE_PATTERN =
  /\b(legal advice|lawyer advice|sue|lawsuit|tax advice|invest(ment)? advice|financial advice|stock tip|medical advice|diagnose)\b/i;

const INTENT_RULES: { intent: ChatIntent; patterns: RegExp[]; response: string; links?: { label: string; href: string }[] }[] = [
  {
    intent: "PLATFORM_NAVIGATION",
    patterns: [/how (do i|to) (find|browse|search)/i, /navigate|menu|where is/i, /dashboard/i],
    response:
      "Use the top navigation to Browse manufacturers, open your Dashboard, or visit Payments and Ads. Admins can open the Admin Console from the nav when authorized.",
    links: [
      { label: "Browse", href: "/browse" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Help Center", href: "/help" },
    ],
  },
  {
    intent: "FEATURE_GUIDANCE",
    patterns: [/register|sign up|onboard/i, /manufacturer/i, /visionary/i, /vendor|labor|logistics/i, /listing|template/i],
    response:
      "Start with registration, pick your role, then complete guided onboarding. Manufacturers list facilities/machinery; Visionaries post requirements; Vendors/Labor/Logistics publish services. Use listing templates for a head start.",
    links: [
      { label: "Register", href: "/register" },
      { label: "Onboarding", href: "/onboarding" },
      { label: "Templates", href: "/templates" },
    ],
  },
  {
    intent: "FEATURE_GUIDANCE",
    patterns: [/booking|book/i, /payment|pay|invoice/i, /subscription|pricing/i, /review|rating/i, /message|chat/i, /verif/i, /dispute/i],
    response:
      "Bookings appear under Bookings. Payments and receipts are in Dashboard → Payments. Manage plans on Pricing. After a completed booking you can leave a review. Verification badges are reviewed by admins. Disputes are opened from the booking legal flow.",
    links: [
      { label: "Bookings", href: "/bookings" },
      { label: "Payments", href: "/dashboard/payments" },
      { label: "Pricing", href: "/pricing" },
      { label: "Reviews", href: "/reviews" },
    ],
  },
  {
    intent: "TROUBLESHOOTING",
    patterns: [/not working|error|bug|can't|cannot|issue|problem|failed|login/i],
    response:
      "Try signing out and back in, check your role on your profile, and confirm your account is not suspended. If a payment failed, open the transaction details under Payments. For persistent issues, escalate to Support.",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Contact Support", href: "/help?escalate=1" },
    ],
  },
  {
    intent: "HELP_CENTER",
    patterns: [/help article|knowledge|faq|documentation|guide/i],
    response: "Browse the Help Center by role and category, or search articles. Popular topics cover Getting Started, Listings, Bookings, and Payments.",
    links: [{ label: "Help Center", href: "/help" }],
  },
  {
    intent: "ESCALATION",
    patterns: [/speak to (a )?human|support ticket|contact support|escalate|agent/i],
    response:
      "I can help you create a support ticket. Provide a short subject and description on the support form, or continue and I’ll prepare escalation details.",
    links: [
      { label: "Open Support Form", href: "/help?escalate=1" },
      { label: "Email Support", href: "mailto:support@xiy.example" },
    ],
  },
];

const DEFAULT_SUGGESTIONS = [
  "How do I register?",
  "How do bookings work?",
  "Where are my payments?",
  "Show listing templates",
  "Contact support",
];

function escapeSafe(text: string) {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export class ChatbotService {
  static getSuggestions(role?: string | null): string[] {
    const base = [...DEFAULT_SUGGESTIONS];
    if (role === "MANUFACTURER") {
      return ["Complete manufacturer profile", "Add a machinery listing", "Respond to a request", ...base];
    }
    if (role === "VISIONARY") {
      return ["Post a requirement", "Browse manufacturers", "Track my booking", ...base];
    }
    if (role === "VENDOR" || role === "LABOR_SUPPLIER" || role === "LOGISTICS_PROVIDER") {
      return ["Publish my service", "Respond to an inquiry", "Upgrade subscription", ...base];
    }
    return base;
  }

  static detectIntent(message: string): ChatIntent {
    if (ADVICE_PATTERN.test(message)) return "LEGAL_DISCLAIMER";
    for (const rule of INTENT_RULES) {
      if (rule.patterns.some((p) => p.test(message))) return rule.intent;
    }
    return "GENERAL_FAQ";
  }

  static reply(message: string, roleHint?: string | null): ChatbotReply {
    const trimmed = message.trim().slice(0, 2000);
    const intent = this.detectIntent(trimmed);

    if (intent === "LEGAL_DISCLAIMER") {
      return {
        intent,
        message: escapeSafe(
          "I’m not able to provide legal, financial, investment, or medical advice. For contracts, compliance, or tax questions, connect with a verified Legal Provider on X!Y, or contact platform Support for account issues.",
        ),
        suggestions: ["Find a Legal Provider", "Open Help Center", "Contact support"],
        quickReplies: ["Browse legal providers", "Help Center", "Create support ticket"],
        escalate: false,
        links: [
          { label: "Legal Providers", href: "/legal" },
          { label: "Help Center", href: "/help" },
          { label: "Support", href: "/help?escalate=1" },
        ],
        disclaimer: "Not legal or financial advice.",
      };
    }

    const rule = INTENT_RULES.find((r) => r.intent === intent && r.patterns.some((p) => p.test(trimmed)));
    const matched = rule || {
      intent: "GENERAL_FAQ" as ChatIntent,
      response:
        "I’m the X!Y helper. Ask about registration, dashboards, listings, bookings, payments, reviews, or search the Help Center. I won’t give legal or investment advice.",
      links: [
        { label: "Help Center", href: "/help" },
        { label: "Templates", href: "/templates" },
        { label: "Onboarding", href: "/onboarding" },
      ],
    };

    const escalate = intent === "ESCALATION";
    return {
      intent: matched.intent,
      message: escapeSafe(matched.response),
      suggestions: this.getSuggestions(roleHint),
      quickReplies: [
        "Getting started",
        "Bookings & payments",
        "Listing templates",
        escalate ? "Create support ticket" : "Contact support",
      ],
      escalate,
      links: matched.links || [{ label: "Help Center", href: "/help" }],
    };
  }
}
