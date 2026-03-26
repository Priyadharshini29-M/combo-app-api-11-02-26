import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getAnalytics } from "../utils/api-helpers";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  console.log(`[API Analytics] Loader triggered for ${shop}`);

  const analyticsData = await getAnalytics(shop, start, end);

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
    const body = await request.clone().json().catch(() => ({}));

    const response = await fetch(
      `https://darkblue-dotterel-303283.hostingersite.com/analytics.php?shop_domain=${shop}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...body,
          shop_domain: shop,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return json(data);

  } catch (error) {
    console.error("[API Analytics] Action error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};