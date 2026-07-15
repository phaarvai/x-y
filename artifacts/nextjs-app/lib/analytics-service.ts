import { and, desc, eq, gte, lte, or, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  usersTable,
  bookingsTable,
  transactionsTable,
  notificationsTable,
  feedbackTable,
  listingModerationsTable,
  userSubscriptionsTable,
  subscriptionPlansTable,
  advertisementsTable,
  manufacturingRequestsTable,
  userFavoritesTable,
  searchAnalyticsEventsTable,
  entityViewsTable,
  dashboardMetricCacheTable,
  auditLogsTable,
  serviceProviderProfilesTable,
  vendorMaterialsTable,
  laborListingsTable,
  logisticsServicesTable,
  vendorInquiriesTable,
  laborInquiriesTable,
  logisticsQuotesTable,
  legalServiceProvidersTable,
  marketOpportunitiesTable,
  disputesTable,
  supportCasesTable,
  categoriesTable,
  ratingSummariesTable,
} from "@/lib/schema";
import {
  getMemoryCache,
  setMemoryCache,
  parseDateRange,
  startOfToday,
  startOfMonth,
  startOfYear,
  type DateRange,
} from "@/lib/analytics-utils";
import { writeAuditLog } from "@/lib/legal-auth";

const CACHE_TTL_MS = 60_000;

async function getDbCache<T>(key: string): Promise<T | null> {
  try {
    const [row] = await db
      .select()
      .from(dashboardMetricCacheTable)
      .where(eq(dashboardMetricCacheTable.cacheKey, key))
      .limit(1);
    if (!row || row.expiresAt < new Date()) return null;
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

async function setDbCache(key: string, payload: unknown, ttlMs = CACHE_TTL_MS, userId?: number) {
  const expiresAt = new Date(Date.now() + ttlMs);
  const body = JSON.stringify(payload);
  try {
    const [existing] = await db
      .select()
      .from(dashboardMetricCacheTable)
      .where(eq(dashboardMetricCacheTable.cacheKey, key))
      .limit(1);
    if (existing) {
      await db
        .update(dashboardMetricCacheTable)
        .set({ payload: body, expiresAt, updatedAt: new Date(), userId: userId ?? null })
        .where(eq(dashboardMetricCacheTable.id, existing.id));
    } else {
      await db.insert(dashboardMetricCacheTable).values({
        cacheKey: key,
        scope: userId ? "USER" : "GLOBAL",
        userId: userId ?? null,
        payload: body,
        expiresAt,
      });
    }
  } catch {
    /* cache best-effort */
  }
}

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>, userId?: number): Promise<T> {
  const mem = getMemoryCache<T>(key);
  if (mem != null) return mem;
  const dbHit = await getDbCache<T>(key);
  if (dbHit != null) {
    setMemoryCache(key, dbHit, ttlMs);
    return dbHit;
  }
  const value = await fn();
  setMemoryCache(key, value, ttlMs);
  await setDbCache(key, value, ttlMs, userId);
  return value;
}

function sumPaid(rows: { amount: string | null }[]) {
  return rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
}

export class AnalyticsService {
  static parseRange(query: Record<string, unknown>): DateRange {
    return parseDateRange({
      range: query.range ? String(query.range) : undefined,
      from: query.from ? String(query.from) : undefined,
      to: query.to ? String(query.to) : undefined,
    });
  }

  static async getManufacturerDashboard(userId: number) {
    const key = `mfg-dash:${userId}`;
    return cached(key, CACHE_TTL_MS, async () => {
      const today = startOfToday();
      const month = startOfMonth();
      const year = startOfYear();

      const [
        [{ activeListings }],
        [{ draftListings }],
        [{ pendingRequests }],
        [{ acceptedRequests }],
        [{ upcomingBookings }],
        [{ productionJobs }],
        [{ unreadNotifs }],
        [{ reviewCount }],
        [{ avgRating }],
        [{ todayRev }],
        [{ monthRev }],
        [{ yearRev }],
        [{ pendingPayments }],
        sub,
        recentMessages,
        recentReviews,
        calendarBookings,
      ] = await Promise.all([
        db
          .select({ activeListings: sql<number>`count(*)::int` })
          .from(listingModerationsTable)
          .where(
            and(
              eq(listingModerationsTable.ownerUserId, userId),
              eq(listingModerationsTable.status, "APPROVED"),
            ),
          ),
        db
          .select({ draftListings: sql<number>`count(*)::int` })
          .from(listingModerationsTable)
          .where(
            and(
              eq(listingModerationsTable.ownerUserId, userId),
              or(
                eq(listingModerationsTable.status, "PENDING"),
                eq(listingModerationsTable.status, "CHANGES_REQUESTED"),
              )!,
            ),
          ),
        db
          .select({ pendingRequests: sql<number>`count(*)::int` })
          .from(manufacturingRequestsTable)
          .where(
            and(
              eq(manufacturingRequestsTable.manufacturerUserId, userId),
              eq(manufacturingRequestsTable.status, "PENDING"),
            ),
          ),
        db
          .select({ acceptedRequests: sql<number>`count(*)::int` })
          .from(manufacturingRequestsTable)
          .where(
            and(
              eq(manufacturingRequestsTable.manufacturerUserId, userId),
              eq(manufacturingRequestsTable.status, "ACCEPTED"),
            ),
          ),
        db
          .select({ upcomingBookings: sql<number>`count(*)::int` })
          .from(bookingsTable)
          .where(
            and(
              eq(bookingsTable.manufacturerUserId, userId),
              gte(bookingsTable.startDate, today),
              or(eq(bookingsTable.status, "CONFIRMED"), eq(bookingsTable.status, "PENDING"))!,
            ),
          ),
        db
          .select({ productionJobs: sql<number>`count(*)::int` })
          .from(bookingsTable)
          .where(
            and(
              eq(bookingsTable.manufacturerUserId, userId),
              or(
                eq(bookingsTable.status, "PRODUCTION"),
                eq(bookingsTable.status, "IN_PROGRESS"),
                eq(bookingsTable.status, "IN_PRODUCTION"),
              )!,
            ),
          ),
        db
          .select({ unreadNotifs: sql<number>`count(*)::int` })
          .from(notificationsTable)
          .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.status, "UNREAD"))),
        db
          .select({ reviewCount: sql<number>`count(*)::int` })
          .from(feedbackTable)
          .where(eq(feedbackTable.reviewedUserId, userId)),
        db
          .select({
            avgRating: sql<string>`coalesce(avg(overall_rating), 0)::text`,
          })
          .from(feedbackTable)
          .where(eq(feedbackTable.reviewedUserId, userId)),
        db
          .select({
            todayRev: sql<string>`coalesce(sum(amount::numeric), 0)::text`,
          })
          .from(transactionsTable)
          .where(
            and(
              eq(transactionsTable.payeeUserId, userId),
              eq(transactionsTable.status, "PAID"),
              gte(transactionsTable.transactionDate, today),
            ),
          ),
        db
          .select({
            monthRev: sql<string>`coalesce(sum(amount::numeric), 0)::text`,
          })
          .from(transactionsTable)
          .where(
            and(
              eq(transactionsTable.payeeUserId, userId),
              eq(transactionsTable.status, "PAID"),
              gte(transactionsTable.transactionDate, month),
            ),
          ),
        db
          .select({
            yearRev: sql<string>`coalesce(sum(amount::numeric), 0)::text`,
          })
          .from(transactionsTable)
          .where(
            and(
              eq(transactionsTable.payeeUserId, userId),
              eq(transactionsTable.status, "PAID"),
              gte(transactionsTable.transactionDate, year),
            ),
          ),
        db
          .select({ pendingPayments: sql<number>`count(*)::int` })
          .from(transactionsTable)
          .where(
            and(
              eq(transactionsTable.payeeUserId, userId),
              or(eq(transactionsTable.status, "PENDING"), eq(transactionsTable.status, "PROCESSING"))!,
            ),
          ),
        db
          .select({
            status: userSubscriptionsTable.status,
            planName: subscriptionPlansTable.name,
            endDate: userSubscriptionsTable.endDate,
          })
          .from(userSubscriptionsTable)
          .leftJoin(
            subscriptionPlansTable,
            eq(userSubscriptionsTable.planId, subscriptionPlansTable.id),
          )
          .where(eq(userSubscriptionsTable.userId, userId))
          .orderBy(desc(userSubscriptionsTable.createdAt))
          .limit(1)
          .then((r) => r[0] ?? null),
        db
          .select()
          .from(notificationsTable)
          .where(eq(notificationsTable.userId, userId))
          .orderBy(desc(notificationsTable.createdAt))
          .limit(8),
        db
          .select()
          .from(feedbackTable)
          .where(eq(feedbackTable.reviewedUserId, userId))
          .orderBy(desc(feedbackTable.createdAt))
          .limit(5),
        db
          .select()
          .from(bookingsTable)
          .where(eq(bookingsTable.manufacturerUserId, userId))
          .orderBy(desc(bookingsTable.startDate))
          .limit(20),
      ]);

      const profileCompletion = await this.computeProfileCompletion(userId, "MANUFACTURER");

      return {
        widgets: {
          activeListings,
          draftListings,
          pendingRequests,
          acceptedRequests,
          upcomingBookings,
          currentProductionJobs: productionJobs,
          availabilityAlerts: draftListings > 0 ? draftListings : 0,
          recentMessages: recentMessages.filter((n) => n.category === "MESSAGE").length,
          notifications: unreadNotifs,
          ratingsReviews: { count: reviewCount, average: Number(avgRating) },
          revenue: { today: todayRev, month: monthRev, year: yearRev },
          profileCompletion,
          subscription: sub
            ? {
                status: sub.status,
                planName: sub.planName,
                endDate: sub.endDate?.toISOString() ?? null,
              }
            : null,
          pendingPayments,
        },
        calendar: calendarBookings.map((b) => ({
          id: b.id,
          reference: b.reference,
          status: b.status,
          startDate: b.startDate?.toISOString() ?? null,
          endDate: b.endDate?.toISOString() ?? null,
        })),
        recentReviews: recentReviews.map((r) => ({
          id: r.id,
          overallRating: r.overallRating,
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
        })),
        notifications: recentMessages.map((n) => ({
          id: n.id,
          title: n.title,
          eventType: n.eventType,
          status: n.status,
          createdAt: n.createdAt.toISOString(),
        })),
        quickActions: [
          { label: "Add Machinery", href: "/provider-setup" },
          { label: "Update Availability", href: "/availability" },
          { label: "Respond to Request", href: "/requests?inbox=manufacturer" },
          { label: "View Notifications", href: "/notifications" },
          { label: "Manage Bookings", href: "/bookings" },
          { label: "Upgrade Subscription", href: "/pricing" },
        ],
      };
    }, userId);
  }

  static async getManufacturerRevenue(userId: number) {
    const today = startOfToday();
    const month = startOfMonth();
    const year = startOfYear();
    const paid = and(eq(transactionsTable.payeeUserId, userId), eq(transactionsTable.status, "PAID"));

    const [[{ todayAmt }], [{ monthAmt }], [{ yearAmt }], recent] = await Promise.all([
      db
        .select({ todayAmt: sql<string>`coalesce(sum(amount::numeric), 0)::text` })
        .from(transactionsTable)
        .where(and(paid!, gte(transactionsTable.transactionDate, today))),
      db
        .select({ monthAmt: sql<string>`coalesce(sum(amount::numeric), 0)::text` })
        .from(transactionsTable)
        .where(and(paid!, gte(transactionsTable.transactionDate, month))),
      db
        .select({ yearAmt: sql<string>`coalesce(sum(amount::numeric), 0)::text` })
        .from(transactionsTable)
        .where(and(paid!, gte(transactionsTable.transactionDate, year))),
      db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.payeeUserId, userId))
        .orderBy(desc(transactionsTable.transactionDate))
        .limit(20),
    ]);

    return {
      today: todayAmt,
      month: monthAmt,
      year: yearAmt,
      recent: recent.map((t) => ({
        id: t.id,
        amount: t.amount,
        status: t.status,
        transactionDate: t.transactionDate.toISOString(),
      })),
    };
  }

  static async getManufacturerActivity(userId: number) {
    const [listings, bookings, reviews, payments, notifs] = await Promise.all([
      db
        .select()
        .from(listingModerationsTable)
        .where(eq(listingModerationsTable.ownerUserId, userId))
        .orderBy(desc(listingModerationsTable.createdAt))
        .limit(10),
      db
        .select()
        .from(bookingsTable)
        .where(eq(bookingsTable.manufacturerUserId, userId))
        .orderBy(desc(bookingsTable.createdAt))
        .limit(10),
      db
        .select()
        .from(feedbackTable)
        .where(eq(feedbackTable.reviewedUserId, userId))
        .orderBy(desc(feedbackTable.createdAt))
        .limit(10),
      db
        .select()
        .from(transactionsTable)
        .where(
          and(eq(transactionsTable.payeeUserId, userId), eq(transactionsTable.status, "PAID")),
        )
        .orderBy(desc(transactionsTable.transactionDate))
        .limit(10),
      db
        .select()
        .from(notificationsTable)
        .where(eq(notificationsTable.userId, userId))
        .orderBy(desc(notificationsTable.createdAt))
        .limit(10),
    ]);

    const feed = [
      ...listings.map((l) => ({
        type: "LISTING_CREATED",
        label: `Listing ${l.title || l.listingId} (${l.status})`,
        createdAt: l.createdAt.toISOString(),
      })),
      ...bookings.map((b) => ({
        type: "BOOKING_RECEIVED",
        label: `Booking ${b.reference}`,
        createdAt: b.createdAt.toISOString(),
      })),
      ...reviews.map((r) => ({
        type: "REVIEW_RECEIVED",
        label: `Review ${r.overallRating}★`,
        createdAt: r.createdAt.toISOString(),
      })),
      ...payments.map((p) => ({
        type: "PAYMENT_RECEIVED",
        label: `Payment ₹${p.amount}`,
        createdAt: p.transactionDate.toISOString(),
      })),
      ...notifs.map((n) => ({
        type: "NOTIFICATION",
        label: n.title,
        createdAt: n.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 30);

    return { items: feed };
  }

  static async getVisionaryDashboard(userId: number) {
    const key = `vis-dash:${userId}`;
    return cached(key, CACHE_TTL_MS, async () => {
      const [
        [{ draftReqs }],
        [{ postedReqs }],
        [{ closedReqs }],
        [{ expiredReqs }],
        [{ sentRequests }],
        [{ acceptedRequests }],
        [{ savedManufacturers }],
        [{ savedListings }],
        [{ unreadNotifs }],
        [{ pendingReviews }],
        bookings,
        payments,
        sub,
        notifs,
      ] = await Promise.all([
        db
          .select({ draftReqs: sql<number>`count(*)::int` })
          .from(manufacturingRequestsTable)
          .where(
            and(
              eq(manufacturingRequestsTable.visionaryUserId, userId),
              eq(manufacturingRequestsTable.status, "DRAFT"),
            ),
          ),
        db
          .select({ postedReqs: sql<number>`count(*)::int` })
          .from(manufacturingRequestsTable)
          .where(
            and(
              eq(manufacturingRequestsTable.visionaryUserId, userId),
              or(
                eq(manufacturingRequestsTable.status, "PUBLISHED"),
                eq(manufacturingRequestsTable.status, "PENDING"),
              )!,
            ),
          ),
        db
          .select({ closedReqs: sql<number>`count(*)::int` })
          .from(manufacturingRequestsTable)
          .where(
            and(
              eq(manufacturingRequestsTable.visionaryUserId, userId),
              eq(manufacturingRequestsTable.status, "CLOSED"),
            ),
          ),
        db
          .select({ expiredReqs: sql<number>`count(*)::int` })
          .from(manufacturingRequestsTable)
          .where(
            and(
              eq(manufacturingRequestsTable.visionaryUserId, userId),
              eq(manufacturingRequestsTable.status, "EXPIRED"),
            ),
          ),
        db
          .select({ sentRequests: sql<number>`count(*)::int` })
          .from(manufacturingRequestsTable)
          .where(
            and(
              eq(manufacturingRequestsTable.visionaryUserId, userId),
              sql`${manufacturingRequestsTable.status} not in ('DRAFT')`,
            ),
          ),
        db
          .select({ acceptedRequests: sql<number>`count(*)::int` })
          .from(manufacturingRequestsTable)
          .where(
            and(
              eq(manufacturingRequestsTable.visionaryUserId, userId),
              eq(manufacturingRequestsTable.status, "ACCEPTED"),
            ),
          ),
        db
          .select({ savedManufacturers: sql<number>`count(*)::int` })
          .from(userFavoritesTable)
          .where(
            and(
              eq(userFavoritesTable.userId, userId),
              eq(userFavoritesTable.entityType, "MANUFACTURER"),
            ),
          ),
        db
          .select({ savedListings: sql<number>`count(*)::int` })
          .from(userFavoritesTable)
          .where(
            and(eq(userFavoritesTable.userId, userId), eq(userFavoritesTable.entityType, "LISTING")),
          ),
        db
          .select({ unreadNotifs: sql<number>`count(*)::int` })
          .from(notificationsTable)
          .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.status, "UNREAD"))),
        db
          .select({ pendingReviews: sql<number>`count(*)::int` })
          .from(bookingsTable)
          .where(
            and(
              eq(bookingsTable.visionaryUserId, userId),
              eq(bookingsTable.status, "COMPLETED"),
            ),
          ),
        db
          .select()
          .from(bookingsTable)
          .where(eq(bookingsTable.visionaryUserId, userId))
          .orderBy(desc(bookingsTable.createdAt))
          .limit(10),
        db
          .select()
          .from(transactionsTable)
          .where(eq(transactionsTable.payerUserId, userId))
          .orderBy(desc(transactionsTable.transactionDate))
          .limit(10),
        db
          .select({
            status: userSubscriptionsTable.status,
            planName: subscriptionPlansTable.name,
            endDate: userSubscriptionsTable.endDate,
          })
          .from(userSubscriptionsTable)
          .leftJoin(
            subscriptionPlansTable,
            eq(userSubscriptionsTable.planId, subscriptionPlansTable.id),
          )
          .where(eq(userSubscriptionsTable.userId, userId))
          .orderBy(desc(userSubscriptionsTable.createdAt))
          .limit(1)
          .then((r) => r[0] ?? null),
        db
          .select()
          .from(notificationsTable)
          .where(eq(notificationsTable.userId, userId))
          .orderBy(desc(notificationsTable.createdAt))
          .limit(8),
      ]);

      const recommended = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          industry: usersTable.industry,
          location: usersTable.location,
          identityVerificationStatus: usersTable.identityVerificationStatus,
        })
        .from(usersTable)
        .where(and(eq(usersTable.primaryRole, "MANUFACTURER"), eq(usersTable.status, "ACTIVE")))
        .orderBy(desc(usersTable.createdAt))
        .limit(6);

      return {
        widgets: {
          draftRequirements: draftReqs,
          postedRequirements: postedReqs,
          recommendedManufacturers: recommended.length,
          savedManufacturers,
          savedListings,
          sentRequests,
          acceptedRequests,
          bookingStatus: bookings.map((b) => ({
            id: b.id,
            reference: b.reference,
            status: b.status,
          })),
          paymentStatus: payments.map((p) => ({
            id: p.id,
            amount: p.amount,
            status: p.status,
          })),
          messages: notifs.filter((n) => n.category === "MESSAGE").length,
          notifications: unreadNotifs,
          pendingReviews,
          subscription: sub
            ? {
                status: sub.status,
                planName: sub.planName,
                endDate: sub.endDate?.toISOString() ?? null,
              }
            : null,
        },
        requirementOverview: {
          draft: draftReqs,
          published: postedReqs,
          closed: closedReqs,
          expired: expiredReqs,
        },
        recommendedManufacturers: recommended,
        notifications: notifs.map((n) => ({
          id: n.id,
          title: n.title,
          status: n.status,
          createdAt: n.createdAt.toISOString(),
        })),
        quickActions: [
          { label: "Create Requirement", href: "/requirements/new" },
          { label: "Browse Manufacturers", href: "/browse" },
          { label: "Saved Listings", href: "/favorites" },
          { label: "Track Booking", href: "/bookings" },
          { label: "Notifications", href: "/notifications" },
          { label: "Manage Payments", href: "/dashboard/payments" },
        ],
      };
    }, userId);
  }

  static async getVisionaryRecommendations(userId: number) {
    const favorites = await db
      .select()
      .from(userFavoritesTable)
      .where(eq(userFavoritesTable.userId, userId))
      .limit(50);

    const recommended = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        industry: usersTable.industry,
        location: usersTable.location,
        identityVerificationStatus: usersTable.identityVerificationStatus,
      })
      .from(usersTable)
      .where(and(eq(usersTable.primaryRole, "MANUFACTURER"), eq(usersTable.status, "ACTIVE")))
      .orderBy(desc(usersTable.updatedAt))
      .limit(12);

    return {
      recommended,
      favorites: favorites.map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
      })),
    };
  }

  static async getVisionaryActivity(userId: number) {
    const [reqs, bookings, payments, notifs] = await Promise.all([
      db
        .select()
        .from(manufacturingRequestsTable)
        .where(eq(manufacturingRequestsTable.visionaryUserId, userId))
        .orderBy(desc(manufacturingRequestsTable.createdAt))
        .limit(15),
      db
        .select()
        .from(bookingsTable)
        .where(eq(bookingsTable.visionaryUserId, userId))
        .orderBy(desc(bookingsTable.createdAt))
        .limit(15),
      db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.payerUserId, userId))
        .orderBy(desc(transactionsTable.transactionDate))
        .limit(15),
      db
        .select()
        .from(notificationsTable)
        .where(eq(notificationsTable.userId, userId))
        .orderBy(desc(notificationsTable.createdAt))
        .limit(15),
    ]);

    const items = [
      ...reqs.map((r) => ({
        type: "REQUIREMENT",
        label: `${r.title} (${r.status})`,
        createdAt: r.createdAt.toISOString(),
      })),
      ...bookings.map((b) => ({
        type: "BOOKING",
        label: `Booking ${b.reference}`,
        createdAt: b.createdAt.toISOString(),
      })),
      ...payments.map((p) => ({
        type: "PAYMENT",
        label: `Payment ${p.status} ₹${p.amount}`,
        createdAt: p.transactionDate.toISOString(),
      })),
      ...notifs.map((n) => ({
        type: "NOTIFICATION",
        label: n.title,
        createdAt: n.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 40);

    return { items };
  }

  static async getServiceProviderDashboard(userId: number, primaryRole: string | null) {
    const key = `sp-dash:${userId}:${primaryRole || "any"}`;
    return cached(key, CACHE_TTL_MS, async () => {
      const providers = await db
        .select()
        .from(serviceProviderProfilesTable)
        .where(eq(serviceProviderProfilesTable.userId, userId));
      const providerIds = providers.map((p) => p.id);
      const providerType = providers[0]?.providerType || primaryRole || "VENDOR";

      let publishedServices = 0;
      let incomingInquiries = 0;
      let quoteRequests = 0;
      let pendingResponses = 0;

      if (providerIds.length) {
        if (providerType === "VENDOR" || primaryRole === "VENDOR") {
          const [pub, inq] = await Promise.all([
            db
              .select({ c: sql<number>`count(*)::int` })
              .from(vendorMaterialsTable)
              .where(
                and(
                  inArray(vendorMaterialsTable.providerId, providerIds),
                  eq(vendorMaterialsTable.isPublished, true),
                ),
              ),
            db
              .select({ c: sql<number>`count(*)::int` })
              .from(vendorInquiriesTable)
              .where(inArray(vendorInquiriesTable.providerId, providerIds)),
          ]);
          publishedServices = pub[0]?.c ?? 0;
          incomingInquiries = inq[0]?.c ?? 0;
          pendingResponses =
            (
              await db
                .select({ c: sql<number>`count(*)::int` })
                .from(vendorInquiriesTable)
                .where(
                  and(
                    inArray(vendorInquiriesTable.providerId, providerIds),
                    eq(vendorInquiriesTable.status, "OPEN"),
                  ),
                )
            )[0]?.c ?? 0;
        } else if (providerType === "LABOR_SUPPLIER" || primaryRole === "LABOR_SUPPLIER") {
          const [pub, inq] = await Promise.all([
            db
              .select({ c: sql<number>`count(*)::int` })
              .from(laborListingsTable)
              .where(
                and(
                  inArray(laborListingsTable.providerId, providerIds),
                  eq(laborListingsTable.isPublished, true),
                ),
              ),
            db
              .select({ c: sql<number>`count(*)::int` })
              .from(laborInquiriesTable)
              .where(inArray(laborInquiriesTable.providerId, providerIds)),
          ]);
          publishedServices = pub[0]?.c ?? 0;
          incomingInquiries = inq[0]?.c ?? 0;
        } else if (providerType === "LOGISTICS_PROVIDER" || primaryRole === "LOGISTICS_PROVIDER") {
          const [pub, quotes] = await Promise.all([
            db
              .select({ c: sql<number>`count(*)::int` })
              .from(logisticsServicesTable)
              .where(
                and(
                  inArray(logisticsServicesTable.providerId, providerIds),
                  eq(logisticsServicesTable.isPublished, true),
                ),
              ),
            db
              .select({ c: sql<number>`count(*)::int` })
              .from(logisticsQuotesTable)
              .where(inArray(logisticsQuotesTable.providerId, providerIds)),
          ]);
          publishedServices = pub[0]?.c ?? 0;
          quoteRequests = quotes[0]?.c ?? 0;
          pendingResponses =
            (
              await db
                .select({ c: sql<number>`count(*)::int` })
                .from(logisticsQuotesTable)
                .where(
                  and(
                    inArray(logisticsQuotesTable.providerId, providerIds),
                    eq(logisticsQuotesTable.status, "REQUESTED"),
                  ),
                )
            )[0]?.c ?? 0;
        } else if (providerType === "MARKET_LEAD" || primaryRole === "MARKET_LEAD") {
          publishedServices =
            (
              await db
                .select({ c: sql<number>`count(*)::int` })
                .from(marketOpportunitiesTable)
                .where(inArray(marketOpportunitiesTable.providerId, providerIds))
            )[0]?.c ?? 0;
        }
      }

      const legal =
        (
          await db
            .select()
            .from(legalServiceProvidersTable)
            .where(eq(legalServiceProvidersTable.userId, userId))
            .limit(1)
        )[0] ?? null;

      const [[{ unreadNotifs }], [{ reviewCount }], [{ avgRating }], [{ ads }], [{ monthRev }], sub] =
        await Promise.all([
          db
            .select({ unreadNotifs: sql<number>`count(*)::int` })
            .from(notificationsTable)
            .where(
              and(eq(notificationsTable.userId, userId), eq(notificationsTable.status, "UNREAD")),
            ),
          db
            .select({ reviewCount: sql<number>`count(*)::int` })
            .from(feedbackTable)
            .where(eq(feedbackTable.reviewedUserId, userId)),
          db
            .select({
              avgRating: sql<string>`coalesce(avg(overall_rating), 0)::text`,
            })
            .from(feedbackTable)
            .where(eq(feedbackTable.reviewedUserId, userId)),
          db
            .select({ ads: sql<number>`count(*)::int` })
            .from(advertisementsTable)
            .where(eq(advertisementsTable.ownerUserId, userId)),
          db
            .select({
              monthRev: sql<string>`coalesce(sum(amount::numeric), 0)::text`,
            })
            .from(transactionsTable)
            .where(
              and(
                eq(transactionsTable.payeeUserId, userId),
                eq(transactionsTable.status, "PAID"),
                gte(transactionsTable.transactionDate, startOfMonth()),
              ),
            ),
          db
            .select({
              status: userSubscriptionsTable.status,
              planName: subscriptionPlansTable.name,
            })
            .from(userSubscriptionsTable)
            .leftJoin(
              subscriptionPlansTable,
              eq(userSubscriptionsTable.planId, subscriptionPlansTable.id),
            )
            .where(eq(userSubscriptionsTable.userId, userId))
            .orderBy(desc(userSubscriptionsTable.createdAt))
            .limit(1)
            .then((r) => r[0] ?? null),
        ]);

      const profile = providers[0] || legal;
      const profileStatus = profile
        ? ("isPublished" in profile && profile.isPublished) ||
          ("isPublished" in (legal || {}) && legal?.isPublished)
          ? "PUBLISHED"
          : "DRAFT"
        : "MISSING";
      const verificationStatus =
        providers[0]?.verificationStatus ||
        legal?.identityVerificationStatus ||
        "UNVERIFIED";

      return {
        providerType,
        widgets: {
          profileStatus,
          verificationStatus,
          publishedServices: publishedServices || (legal?.isPublished ? 1 : 0),
          incomingInquiries,
          quoteRequests,
          pendingResponses,
          ratings: Number(avgRating),
          reviews: reviewCount,
          subscription: sub,
          advertisementStatus: ads,
          notifications: unreadNotifs,
          messages: 0,
          revenue: monthRev,
        },
        profiles: providers.map((p) => ({
          id: p.id,
          providerType: p.providerType,
          displayName: p.displayName,
          verificationStatus: p.verificationStatus,
          isPublished: p.isPublished,
          rating: p.rating,
        })),
        legalProfile: legal
          ? {
              id: legal.id,
              displayName: legal.displayName,
              isPublished: legal.isPublished,
              identityVerificationStatus: legal.identityVerificationStatus,
            }
          : null,
        quickActions: [
          { label: "Update Profile", href: "/profile/complete" },
          { label: "Marketplace Hub", href: "/marketplace" },
          { label: "Notifications", href: "/notifications" },
          { label: "View Reviews", href: "/reviews" },
          { label: "Upgrade Subscription", href: "/pricing" },
          { label: "Manage Advertisements", href: "/dashboard/ads" },
        ],
      };
    }, userId);
  }

  static async getServiceProviderActivity(userId: number) {
    const [notifs, reviews, ads, txns] = await Promise.all([
      db
        .select()
        .from(notificationsTable)
        .where(eq(notificationsTable.userId, userId))
        .orderBy(desc(notificationsTable.createdAt))
        .limit(20),
      db
        .select()
        .from(feedbackTable)
        .where(eq(feedbackTable.reviewedUserId, userId))
        .orderBy(desc(feedbackTable.createdAt))
        .limit(10),
      db
        .select()
        .from(advertisementsTable)
        .where(eq(advertisementsTable.ownerUserId, userId))
        .orderBy(desc(advertisementsTable.createdAt))
        .limit(10),
      db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.payeeUserId, userId))
        .orderBy(desc(transactionsTable.transactionDate))
        .limit(10),
    ]);

    const items = [
      ...notifs.map((n) => ({
        type: "NOTIFICATION",
        label: n.title,
        createdAt: n.createdAt.toISOString(),
      })),
      ...reviews.map((r) => ({
        type: "REVIEW",
        label: `Review ${r.overallRating}★`,
        createdAt: r.createdAt.toISOString(),
      })),
      ...ads.map((a) => ({
        type: "AD",
        label: `Ad ${a.title} (${a.status})`,
        createdAt: a.createdAt.toISOString(),
      })),
      ...txns.map((t) => ({
        type: "REVENUE",
        label: `₹${t.amount} ${t.status}`,
        createdAt: t.transactionDate.toISOString(),
      })),
    ]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 40);

    return { items };
  }

  static async computeProfileCompletion(userId: number, role: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return 0;
    const checks = [
      !!user.name,
      !!user.email,
      !!user.primaryRole,
      !!user.industry,
      !!user.location,
      user.identityVerificationStatus === "VERIFIED",
    ];
    if (role === "MANUFACTURER") {
      const [{ c }] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(listingModerationsTable)
        .where(eq(listingModerationsTable.ownerUserId, userId));
      checks.push(c > 0);
    }
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }

  static async getAdminOverview(range: DateRange) {
    const key = `admin-overview:${range.preset}:${range.from.toISOString()}:${range.to.toISOString()}`;
    return cached(key, CACHE_TTL_MS, async () => {
      const inRange = and(
        gte(usersTable.createdAt, range.from),
        lte(usersTable.createdAt, range.to),
      );

      const [
        [{ totalUsers }],
        roleRows,
        [{ newRegs }],
        [{ verifiedUsers }],
        [{ activeMfg }],
        [{ activeVis }],
        [{ activeVendors }],
        [{ activeSp }],
        [{ totalListings }],
        [{ pendingListings }],
        [{ approvedListings }],
        [{ totalBookings }],
        [{ completedBookings }],
        [{ cancelledBookings }],
        [{ productionJobs }],
        [{ gmv }],
        [{ commission }],
        [{ refunds }],
        [{ pendingPay }],
        [{ totalReviews }],
        [{ avgRating }],
        [{ openDisputes }],
        [{ closedDisputes }],
        [{ supportTickets }],
      ] = await Promise.all([
        db.select({ totalUsers: sql<number>`count(*)::int` }).from(usersTable),
        db
          .select({
            role: usersTable.primaryRole,
            count: sql<number>`count(*)::int`,
          })
          .from(usersTable)
          .groupBy(usersTable.primaryRole),
        db.select({ newRegs: sql<number>`count(*)::int` }).from(usersTable).where(inRange),
        db
          .select({ verifiedUsers: sql<number>`count(*)::int` })
          .from(usersTable)
          .where(eq(usersTable.identityVerificationStatus, "VERIFIED")),
        db
          .select({ activeMfg: sql<number>`count(*)::int` })
          .from(usersTable)
          .where(and(eq(usersTable.primaryRole, "MANUFACTURER"), eq(usersTable.status, "ACTIVE"))),
        db
          .select({ activeVis: sql<number>`count(*)::int` })
          .from(usersTable)
          .where(and(eq(usersTable.primaryRole, "VISIONARY"), eq(usersTable.status, "ACTIVE"))),
        db
          .select({ activeVendors: sql<number>`count(*)::int` })
          .from(usersTable)
          .where(and(eq(usersTable.primaryRole, "VENDOR"), eq(usersTable.status, "ACTIVE"))),
        db
          .select({ activeSp: sql<number>`count(*)::int` })
          .from(serviceProviderProfilesTable)
          .where(eq(serviceProviderProfilesTable.isPublished, true)),
        db.select({ totalListings: sql<number>`count(*)::int` }).from(listingModerationsTable),
        db
          .select({ pendingListings: sql<number>`count(*)::int` })
          .from(listingModerationsTable)
          .where(eq(listingModerationsTable.status, "PENDING")),
        db
          .select({ approvedListings: sql<number>`count(*)::int` })
          .from(listingModerationsTable)
          .where(eq(listingModerationsTable.status, "APPROVED")),
        db.select({ totalBookings: sql<number>`count(*)::int` }).from(bookingsTable),
        db
          .select({ completedBookings: sql<number>`count(*)::int` })
          .from(bookingsTable)
          .where(eq(bookingsTable.status, "COMPLETED")),
        db
          .select({ cancelledBookings: sql<number>`count(*)::int` })
          .from(bookingsTable)
          .where(eq(bookingsTable.status, "CANCELLED")),
        db
          .select({ productionJobs: sql<number>`count(*)::int` })
          .from(bookingsTable)
          .where(
            or(
              eq(bookingsTable.status, "PRODUCTION"),
              eq(bookingsTable.status, "IN_PROGRESS"),
              eq(bookingsTable.status, "IN_PRODUCTION"),
            )!,
          ),
        db
          .select({
            gmv: sql<string>`coalesce(sum(case when status = 'PAID' then amount::numeric else 0 end), 0)::text`,
          })
          .from(transactionsTable)
          .where(
            and(
              gte(transactionsTable.transactionDate, range.from),
              lte(transactionsTable.transactionDate, range.to),
            ),
          ),
        db
          .select({
            commission: sql<string>`coalesce(sum(case when status = 'PAID' then coalesce(platform_fee, commission_amount, 0)::numeric else 0 end), 0)::text`,
          })
          .from(transactionsTable)
          .where(
            and(
              gte(transactionsTable.transactionDate, range.from),
              lte(transactionsTable.transactionDate, range.to),
            ),
          ),
        db
          .select({
            refunds: sql<string>`coalesce(sum(case when status = 'REFUNDED' then amount::numeric else 0 end), 0)::text`,
          })
          .from(transactionsTable),
        db
          .select({ pendingPay: sql<number>`count(*)::int` })
          .from(transactionsTable)
          .where(eq(transactionsTable.status, "PENDING")),
        db.select({ totalReviews: sql<number>`count(*)::int` }).from(feedbackTable),
        db
          .select({
            avgRating: sql<string>`coalesce(avg(overall_rating), 0)::text`,
          })
          .from(feedbackTable),
        db
          .select({ openDisputes: sql<number>`count(*)::int` })
          .from(disputesTable)
          .where(or(eq(disputesTable.status, "OPEN"), eq(disputesTable.status, "UNDER_REVIEW"))!),
        db
          .select({ closedDisputes: sql<number>`count(*)::int` })
          .from(disputesTable)
          .where(or(eq(disputesTable.status, "CLOSED"), eq(disputesTable.status, "RESOLVED"))!),
        db
          .select({ supportTickets: sql<number>`count(*)::int` })
          .from(supportCasesTable)
          .where(
            or(
              eq(supportCasesTable.status, "OPEN"),
              eq(supportCasesTable.status, "ASSIGNED"),
              eq(supportCasesTable.status, "WAITING_FOR_USER"),
            )!,
          ),
      ]);

      const usersByRole: Record<string, number> = {};
      for (const r of roleRows) {
        usersByRole[r.role || "UNSET"] = r.count;
      }

      return {
        range: { preset: range.preset, from: range.from.toISOString(), to: range.to.toISOString() },
        users: {
          totalUsers,
          usersByRole,
          activeManufacturers: activeMfg,
          activeVisionaries: activeVis,
          activeVendors,
          activeServiceProviders: activeSp,
          newRegistrations: newRegs,
          verifiedUsers,
        },
        marketplace: {
          totalListings,
          activeListings: approvedListings,
          pendingListings,
          publishedListings: approvedListings,
          archivedListings: totalListings - approvedListings - pendingListings,
        },
        bookings: {
          totalBookings,
          completedBookings,
          cancelledBookings,
          activeProductionJobs: productionJobs,
        },
        revenue: {
          gmv,
          platformCommission: commission,
          refundAmount: refunds,
          pendingPayments: pendingPay,
        },
        reviews: {
          totalReviews,
          averageRating: Number(avgRating),
        },
        support: {
          openDisputes,
          closedDisputes,
          supportTickets,
        },
      };
    });
  }

  static async getAdminUsers(range: DateRange) {
    const overview = await this.getAdminOverview(range);
    return overview.users;
  }

  static async getAdminBookings(range: DateRange) {
    const overview = await this.getAdminOverview(range);
    const reqStats = await db
      .select({
        status: manufacturingRequestsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(manufacturingRequestsTable)
      .groupBy(manufacturingRequestsTable.status);

    const byStatus: Record<string, number> = {};
    let total = 0;
    let accepted = 0;
    let declined = 0;
    let pending = 0;
    for (const r of reqStats) {
      byStatus[r.status] = r.count;
      total += r.count;
      if (r.status === "ACCEPTED") accepted = r.count;
      if (r.status === "DECLINED") declined = r.count;
      if (r.status === "PENDING") pending = r.count;
    }

    return {
      ...overview.bookings,
      requests: {
        total,
        accepted,
        declined,
        pending,
        acceptanceRate: total ? Math.round((accepted / total) * 1000) / 10 : 0,
        byStatus,
      },
    };
  }

  static async getAdminRevenue(range: DateRange) {
    const month = startOfMonth();
    const year = startOfYear();

    const [[{ monthRev }], [{ yearRev }], [{ subRev }], [{ adCount }]] = await Promise.all([
      db
        .select({
          monthRev: sql<string>`coalesce(sum(case when status = 'PAID' then amount::numeric else 0 end), 0)::text`,
        })
        .from(transactionsTable)
        .where(gte(transactionsTable.transactionDate, month)),
      db
        .select({
          yearRev: sql<string>`coalesce(sum(case when status = 'PAID' then amount::numeric else 0 end), 0)::text`,
        })
        .from(transactionsTable)
        .where(gte(transactionsTable.transactionDate, year)),
      db
        .select({
          subRev: sql<string>`coalesce(sum(${subscriptionPlansTable.price}::numeric), 0)::text`,
        })
        .from(userSubscriptionsTable)
        .innerJoin(
          subscriptionPlansTable,
          eq(userSubscriptionsTable.planId, subscriptionPlansTable.id),
        )
        .where(eq(userSubscriptionsTable.status, "ACTIVE")),
      db
        .select({ adCount: sql<number>`count(*)::int` })
        .from(advertisementsTable)
        .where(or(eq(advertisementsTable.status, "RUNNING"), eq(advertisementsTable.status, "APPROVED"))!),
    ]);

    const overview = await this.getAdminOverview(range);
    return {
      ...overview.revenue,
      monthlyRevenue: monthRev,
      annualRevenue: yearRev,
      subscriptionRevenue: subRev,
      advertisementRevenue: String(adCount * 0), // placeholder until ad billing amounts exist
      range: overview.range,
    };
  }

  static async getAdminSearch(range: DateRange) {
    const inRange = and(
      gte(searchAnalyticsEventsTable.createdAt, range.from),
      lte(searchAnalyticsEventsTable.createdAt, range.to),
    );

    const [[{ totalSearches }], keywords, categories, topViews, regions] = await Promise.all([
      db
        .select({ totalSearches: sql<number>`count(*)::int` })
        .from(searchAnalyticsEventsTable)
        .where(inRange),
      db
        .select({
          query: searchAnalyticsEventsTable.query,
          count: sql<number>`count(*)::int`,
        })
        .from(searchAnalyticsEventsTable)
        .where(inRange)
        .groupBy(searchAnalyticsEventsTable.query)
        .orderBy(desc(sql`count(*)`))
        .limit(20),
      db
        .select({
          category: searchAnalyticsEventsTable.category,
          count: sql<number>`count(*)::int`,
        })
        .from(searchAnalyticsEventsTable)
        .where(inRange)
        .groupBy(searchAnalyticsEventsTable.category)
        .orderBy(desc(sql`count(*)`))
        .limit(20),
      db
        .select({
          entityType: entityViewsTable.entityType,
          entityId: entityViewsTable.entityId,
          count: sql<number>`count(*)::int`,
        })
        .from(entityViewsTable)
        .where(
          and(
            gte(entityViewsTable.createdAt, range.from),
            lte(entityViewsTable.createdAt, range.to),
          ),
        )
        .groupBy(entityViewsTable.entityType, entityViewsTable.entityId)
        .orderBy(desc(sql`count(*)`))
        .limit(20),
      db
        .select({
          region: searchAnalyticsEventsTable.region,
          count: sql<number>`count(*)::int`,
        })
        .from(searchAnalyticsEventsTable)
        .where(inRange)
        .groupBy(searchAnalyticsEventsTable.region)
        .orderBy(desc(sql`count(*)`))
        .limit(20),
    ]);

    return {
      totalSearches,
      mostSearchedKeywords: keywords.filter((k) => k.query),
      mostSearchedCategories: categories.filter((c) => c.category),
      mostViewedListings: topViews,
      mostActiveRegions: regions.filter((r) => r.region),
    };
  }

  static async getAdminCategories() {
    const cats = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        categoryType: categoriesTable.categoryType,
        status: categoriesTable.status,
      })
      .from(categoriesTable)
      .where(eq(categoriesTable.status, "ACTIVE"))
      .limit(100);

    const industries = await db
      .select({
        industry: usersTable.industry,
        count: sql<number>`count(*)::int`,
      })
      .from(usersTable)
      .where(sql`${usersTable.industry} is not null`)
      .groupBy(usersTable.industry)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    const reqCats = await db
      .select({
        category: manufacturingRequestsTable.category,
        count: sql<number>`count(*)::int`,
      })
      .from(manufacturingRequestsTable)
      .where(sql`${manufacturingRequestsTable.category} is not null`)
      .groupBy(manufacturingRequestsTable.category)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    return {
      categories: cats,
      mostActiveIndustries: industries,
      mostActiveCategories: reqCats,
      fastestGrowingCategories: reqCats.slice(0, 10),
    };
  }

  static async getAdminRegions() {
    const cities = await db
      .select({
        city: usersTable.location,
        count: sql<number>`count(*)::int`,
      })
      .from(usersTable)
      .where(sql`${usersTable.location} is not null`)
      .groupBy(usersTable.location)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    const reqCities = await db
      .select({
        city: manufacturingRequestsTable.city,
        state: manufacturingRequestsTable.state,
        country: manufacturingRequestsTable.country,
        count: sql<number>`count(*)::int`,
      })
      .from(manufacturingRequestsTable)
      .groupBy(
        manufacturingRequestsTable.city,
        manufacturingRequestsTable.state,
        manufacturingRequestsTable.country,
      )
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    return {
      mostActiveCities: cities,
      mostActiveStates: reqCities
        .filter((r) => r.state)
        .reduce<{ state: string; count: number }[]>((acc, r) => {
          const existing = acc.find((x) => x.state === r.state);
          if (existing) existing.count += r.count;
          else acc.push({ state: r.state!, count: r.count });
          return acc;
        }, [])
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      mostActiveCountries: reqCities
        .filter((r) => r.country)
        .reduce<{ country: string; count: number }[]>((acc, r) => {
          const existing = acc.find((x) => x.country === r.country);
          if (existing) existing.count += r.count;
          else acc.push({ country: r.country!, count: r.count });
          return acc;
        }, [])
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      regionalGrowth: reqCities.slice(0, 15),
    };
  }

  static async getAdminReviews() {
    const [[{ totalReviews }], [{ avgRating }], [{ reported }], [{ verifiedBookings }]] =
      await Promise.all([
        db.select({ totalReviews: sql<number>`count(*)::int` }).from(feedbackTable),
        db
          .select({
            avgRating: sql<string>`coalesce(avg(overall_rating), 0)::text`,
          })
          .from(feedbackTable),
        db
          .select({ reported: sql<number>`count(*)::int` })
          .from(feedbackTable)
          .where(eq(feedbackTable.isReported, true)),
        db
          .select({ verifiedBookings: sql<number>`count(*)::int` })
          .from(feedbackTable)
          .where(eq(feedbackTable.isVerifiedBooking, true)),
      ]);

    const verificationRate = totalReviews
      ? Math.round((verifiedBookings / totalReviews) * 1000) / 10
      : 0;

    return {
      totalReviews,
      averageRating: Number(avgRating),
      verificationRate,
      reportedReviews: reported,
    };
  }

  static async logDashboardAccess(
    userId: number,
    dashboard: string,
    ip?: string,
  ) {
    await writeAuditLog({
      actorUserId: userId,
      action: "DASHBOARD_ACCESS",
      entityType: "Dashboard",
      entityId: null,
      metadata: { dashboard },
      ipAddress: ip,
    });
  }

  static async recordSearchEvent(input: {
    userId?: number | null;
    query?: string;
    category?: string;
    region?: string;
    city?: string;
    state?: string;
    country?: string;
    resultCount?: number;
    source?: string;
  }) {
    if (!input.query?.trim() && !input.category) return;
    await db.insert(searchAnalyticsEventsTable).values({
      userId: input.userId ?? null,
      query: input.query?.slice(0, 500) ?? null,
      category: input.category ?? null,
      region: input.region ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      country: input.country ?? null,
      resultCount: input.resultCount ?? 0,
      source: input.source ?? "SEARCH",
    });
  }

  static async recordEntityView(input: {
    viewerUserId?: number | null;
    entityType: string;
    entityId: number;
    region?: string;
  }) {
    await db.insert(entityViewsTable).values({
      viewerUserId: input.viewerUserId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      region: input.region ?? null,
    });
  }
}

// silence unused import
void sumPaid;
void auditLogsTable;
void ratingSummariesTable;
