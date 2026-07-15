import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { helpContentTable, listingTemplatesTable, helpArticlesTable, helpFaqsTable } from "@/lib/schema";
import {
  DEFAULT_HELP_CONTENT,
  DEFAULT_TEMPLATES,
  slugify,
} from "@/lib/help-defaults";

let seeded = false;

export async function ensureHelpSeed() {
  if (seeded) return;
  try {
    const [existing] = await db.select({ id: helpContentTable.id }).from(helpContentTable).limit(1);
    if (!existing) {
      for (const row of DEFAULT_HELP_CONTENT) {
        await db.insert(helpContentTable).values({
          page: row.page,
          fieldKey: row.fieldKey,
          title: row.title,
          helpText: row.helpText,
          tooltipText: row.tooltipText,
          example: row.example ?? null,
          language: "en",
          status: "ACTIVE",
        });
      }
    }

    const [tpl] = await db.select({ id: listingTemplatesTable.id }).from(listingTemplatesTable).limit(1);
    if (!tpl) {
      for (const t of DEFAULT_TEMPLATES) {
        await db.insert(listingTemplatesTable).values({
          name: t.name,
          industry: t.industry,
          category: t.category,
          description: t.description,
          templateData: JSON.stringify(t.templateData),
          status: "ACTIVE",
        });
      }
    }

    const [art] = await db.select({ id: helpArticlesTable.id }).from(helpArticlesTable).limit(1);
    if (!art) {
      const starters = [
        {
          title: "Getting started on X!Y",
          role: "GENERAL",
          category: "Getting Started",
          summary: "Create an account, pick a role, and complete onboarding.",
          content:
            "## Welcome\n\nX!Y connects Visionaries with Manufacturers and service providers.\n\n1. Register\n2. Choose your role\n3. Follow the onboarding checklist\n4. Explore Browse, Bookings, and Payments",
          tags: '["onboarding","basics"]',
        },
        {
          title: "Manufacturer onboarding",
          role: "MANUFACTURER",
          category: "Getting Started",
          summary: "Publish capacity so Visionaries can discover you.",
          content:
            "## Manufacturer checklist\n\n- Complete profile and industry\n- Add facility and machinery (use Templates)\n- Set availability and pricing\n- Submit verification when ready",
          tags: '["manufacturer"]',
        },
        {
          title: "Visionary workflow",
          role: "VISIONARY",
          category: "Listings",
          summary: "Post requirements, browse matches, and book capacity.",
          content:
            "## Visionary steps\n\n1. Post a requirement (templates help)\n2. Browse manufacturers\n3. Send requests and negotiate\n4. Confirm booking and pay\n5. Leave a review after completion",
          tags: '["visionary","bookings"]',
        },
        {
          title: "Payments and fees",
          role: "GENERAL",
          category: "Payments",
          summary: "How checkout, receipts, and platform fees work.",
          content:
            "## Payments\n\nOpen Dashboard → Payments to view transactions. Platform commission may apply. Contact Support for failed payments.",
          tags: '["payments"]',
        },
        {
          title: "Disputes and support",
          role: "GENERAL",
          category: "Disputes",
          summary: "Open disputes from bookings and escalate via Support.",
          content:
            "## Need help?\n\nUse the Help chatbot for guidance, or create a support ticket from the Help Center. X!Y assistants never provide legal or financial advice.",
          tags: '["disputes","support"]',
        },
      ];
      for (const a of starters) {
        await db.insert(helpArticlesTable).values({
          ...a,
          slug: slugify(a.title),
          status: "PUBLISHED",
          publishedAt: new Date(),
        });
      }
    }

    const [faq] = await db.select({ id: helpFaqsTable.id }).from(helpFaqsTable).limit(1);
    if (!faq) {
      const faqs = [
        {
          question: "Is X!Y free to join?",
          answer: "Registration is free. Subscriptions and marketplace fees may apply based on your plan.",
          category: "Getting Started",
        },
        {
          question: "Can the chatbot give legal advice?",
          answer: "No. For legal matters, connect with verified Legal Providers on the platform.",
          category: "Legal",
        },
        {
          question: "How do I change my role?",
          answer: "Update your role from your account settings if allowed, or contact Support for assistance.",
          category: "Account",
        },
      ];
      for (const f of faqs) {
        await db.insert(helpFaqsTable).values({ ...f, role: "GENERAL", status: "ACTIVE" });
      }
    }
    seeded = true;
  } catch (err) {
    console.warn("help seed skipped", err);
  }
}

export async function getHelpForPage(page: string, language = "en") {
  await ensureHelpSeed();
  return db
    .select()
    .from(helpContentTable)
    .where(
      and(
        eq(helpContentTable.page, page),
        eq(helpContentTable.language, language),
        eq(helpContentTable.status, "ACTIVE"),
      ),
    );
}
