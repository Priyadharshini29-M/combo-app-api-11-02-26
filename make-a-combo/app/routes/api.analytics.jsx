import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getAnalytics } from "../utils/api-helpers";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const dateRange = url.searchParams.get("date_range");

  // Backwards compatibility:
  // If an older client sends `date_range` but not explicit `start/end`,
  // convert into explicit datetime boundaries.
  const toYMDUtc = (d) => {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  let computedStart = start;
  let computedEnd = end;
  if (dateRange && (!computedStart || !computedEnd)) {
    const now = new Date();
    const endYMD = toYMDUtc(now);
    if (dateRange === "today") {
      computedStart = `${endYMD} 00:00:00`;
      computedEnd = `${endYMD} 23:59:59`;
    } else if (dateRange === "last_7_days") {
      const startDate = new Date(now);
      startDate.setUTCDate(startDate.getUTCDate() - 6); // inclusive of today
      computedStart = `${toYMDUtc(startDate)} 00:00:00`;
      computedEnd = `${endYMD} 23:59:59`;
    } else if (dateRange === "last_30_days") {
      const startDate = new Date(now);
      startDate.setUTCDate(startDate.getUTCDate() - 29); // inclusive of today
      computedStart = `${toYMDUtc(startDate)} 00:00:00`;
      computedEnd = `${endYMD} 23:59:59`;
    }
  }

  console.log(`[API Analytics] Loader triggered for ${shop}`);

  const analyticsData = await getAnalytics(shop, computedStart, computedEnd, dateRange);

  if (!analyticsData) {
    return json({ error: "Failed to fetch analytics data" }, { status: 500 });
  }

  return json(analyticsData);
};

// ✅ ACTION (also fixed)
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  try {
    const url = new URL(request.url);
    const body = await request.clone().json().catch(() => ({}));

    // Support both naming styles:
    // - Our UI uses `start`/`end` for /api/analytics
    // - PHP endpoint expects `start_date`/`end_date`
    const dateRange =
      url.searchParams.get("date_range") ??
      url.searchParams.get("dateRange") ??
      body.date_range ??
      body.dateRange ??
      null;

    const start =
      url.searchParams.get("start") ??
      url.searchParams.get("start_date") ??
      body.start ??
      body.start_date ??
      null;

    const end =
      url.searchParams.get("end") ?? url.searchParams.get("end_date") ?? body.end ?? body.end_date ?? null;

    // Backwards compatibility for action as well.
    const toYMDUtc = (d) => {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    let computedStart = start;
    let computedEnd = end;
    if (dateRange && (!computedStart || !computedEnd)) {
      const now = new Date();
      const endYMD = toYMDUtc(now);
      if (dateRange === "today") {
        computedStart = `${endYMD} 00:00:00`;
        computedEnd = `${endYMD} 23:59:59`;
      } else if (dateRange === "last_7_days") {
        const startDate = new Date(now);
        startDate.setUTCDate(startDate.getUTCDate() - 6);
        computedStart = `${toYMDUtc(startDate)} 00:00:00`;
        computedEnd = `${endYMD} 23:59:59`;
      } else if (dateRange === "last_30_days") {
        const startDate = new Date(now);
        startDate.setUTCDate(startDate.getUTCDate() - 29);
        computedStart = `${toYMDUtc(startDate)} 00:00:00`;
        computedEnd = `${endYMD} 23:59:59`;
      }
    }

    const analyticsData = await getAnalytics(shop, computedStart, computedEnd, dateRange);
    if (!analyticsData) {
      return json({ error: "Failed to fetch analytics data" }, { status: 500 });
    }

    // Keep response consistent with loader.
    return json(analyticsData);

  } catch (error) {
    console.error("[API Analytics] Action error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};