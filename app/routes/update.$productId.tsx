import { redirect, type ActionFunctionArgs } from "@remix-run/node";

type ProductUpdateResponse = {
  data: {
    productUpdate: {
      product: {
        id: string;
        title: string;
      } | null;
      userErrors: Array<{
        field: string[];
        message: string;
      }>;
    };
  };
}

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || "patrol-test.myshopify.com";
  const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || "";

  const formData = await request.formData();
  
  const newTitle = formData.get("title");
  
  const productId = params.productId;

  if (!newTitle || typeof newTitle !== "string") {
    throw new Error("Title is required");
  }

  if (!productId) {
    throw new Error("Product ID is required");
  }

  // GraphQL IDs look like: gid://shopify/Product/123456789
  const globalId = productId.startsWith("gid://") 
    ? productId 
    : `gid://shopify/Product/${productId}`;

  const mutation = `
    mutation updateProduct($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          title
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await fetch(
      `https://${SHOPIFY_STORE_URL}/admin/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            input: {
              id: globalId,
              title: newTitle,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ProductUpdateResponse = await response.json();

    if (result.data.productUpdate.userErrors.length > 0) {
      const errorMessages = result.data.productUpdate.userErrors
        .map((err) => err.message)
        .join(", ");
      throw new Error(`Shopify error: ${errorMessages}`);
    }

    return redirect("/");
  } catch (error) {
    console.error("Error updating product:", error);
    throw new Response("Failed to update product", { status: 500 });
  }
};