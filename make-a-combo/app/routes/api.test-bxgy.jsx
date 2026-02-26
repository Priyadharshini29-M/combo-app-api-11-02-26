import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request);

    const mutation = `#graphql
        mutation discountCodeBxgyCreate($bxgyCodeDiscount: DiscountCodeBxgyInput!) {
            discountCodeBxgyCreate(bxgyCodeDiscount: $bxgyCodeDiscount) {
                codeDiscountNode {
                    id
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `;

    const variables = {
        bxgyCodeDiscount: {
            title: "Test BXGY",
            code: "TESTBXGY" + Math.random().toString(36).substring(7),
            startsAt: new Date().toISOString(),
            customerSelection: { all: true },
            customerBuys: {
                value: { quantity: "1" },
                items: { all: true }
            },
            customerGets: {
                value: {
                    discountOnQuantity: {
                        quantity: "1",
                        effect: { amount: 10 }
                    }
                },
                items: { all: true }
            }
        }
    };

    const response = await admin.graphql(mutation, { variables });
    const responseJson = await response.json();
    return json(responseJson);
};
