import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

type ShopifyProduct = {
  id: string;
  title: string;
  featuredImage?: {
    url: string;
  };
}

type ShopifyProductsResponse = {
  data: {
    products: {
      edges: Array<{
        node: ShopifyProduct;
      }>;
    };
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || "patrol-test.myshopify.com";
  const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || "";

  // GraphQL query to fetch products
  const query = `
    query getProducts {
      products(first: 10) {
        edges {
          node {
            id
            title
            featuredImage {
              url
            }
          }
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
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ShopifyProductsResponse = await response.json();
    
    // Transform GraphQL response to match component expectations
    const products = result.data.products.edges.map(edge => ({
      id: edge.node.id,
      title: edge.node.title,
      image: edge.node.featuredImage ? { src: edge.node.featuredImage.url } : null,
    }));

    return json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Response("Failed to fetch products", { status: 500 });
  }
};

export default function Index() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <div style={{ margin: "20px" }}>
      <h1>Product List</h1>
      <ul>
        {data.products.map((product) => (
          <li key={product.id}>
            {product.image && (
              <div style={{ width: "250px" }}>
                <img src={product.image.src} alt={product.title} />
              </div>
            )}
            <p>
              Product Title: <b>{product.title}</b>
            </p>
            <form method="post" action={`/update/${product.id}`}>
              <input 
                type="text" 
                name="title" 
                placeholder="Update Title"
                defaultValue={product.title}
              />
              <button
                style={{
                  marginLeft: "10px",
                  border: "1px solid black",
                  padding: "5px",
                }}
              >
                Update
              </button>
            </form>
            <hr />
          </li>
        ))}
      </ul>
    </div>
  );
}