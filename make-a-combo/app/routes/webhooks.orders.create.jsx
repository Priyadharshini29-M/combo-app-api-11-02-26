import { authenticate } from '../shopify.server';

export const action = async ({ request }) => {
  const { shop, payload, admin } = await authenticate.webhook(request);

  try {
    const noteAttributes = payload?.note_attributes || [];
    const isComboOrder = noteAttributes.some(
      (attr) => attr.name === 'combo_source' && attr.value === 'combo-builder'
    );

    if (!isComboOrder) return new Response(null, { status: 200 });

    const orderId = payload?.admin_graphql_api_id;
    if (!orderId) return new Response(null, { status: 200 });

    // Add 'combo-builder' tag so we can filter orders in analytics
    await admin.graphql(
      `#graphql
      mutation addComboTag($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          node { id }
          userErrors { field message }
        }
      }`,
      { variables: { id: orderId, tags: ['combo-builder'] } }
    );

    console.log(`[Webhook] Tagged order ${orderId} as combo-builder for ${shop}`);
  } catch (err) {
    console.error('[Webhook] orders/create error:', err.message);
  }

  return new Response(null, { status: 200 });
};
