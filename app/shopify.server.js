import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

async function graphqlRequest(session, query, variables = {}) {
  const client = await shopify.api.clients.Graphql({ session });
  const response = await client.query({ data: { query, variables } });
  return response.body;
}

/* ========== PRODUCTS ========== */
export async function getProducts(session, first = 10) {
  const query = `
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            seo {
              title
              description
            }
            images(first: 1) {
              edges {
                node {
                  url
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphqlRequest(session, query, { first });
  return data.data.products.edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    description: node.description,
    seo: node.seo,
    image: node.images.edges[0]?.node.url || null,
  }));
}

export async function updateProductSEO(
  session,
  productId,
  seoTitle,
  seoDescription,
) {
  const mutation = `
    mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          seo {
            title
            description
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const input = {
    id: productId,
    seo: { title: seoTitle, description: seoDescription },
  };

  const data = await graphqlRequest(session, mutation, { input });

  if (data.data.productUpdate.userErrors.length > 0) {
    throw new Error(data.data.productUpdate.userErrors[0].message);
  }

  return data.data.productUpdate.product;
}

/* ========== PAGES ========== */
export async function getPages(session, first = 10) {
  const query = `
    query getPages($first: Int!) {
      pages(first: $first) {
        edges {
          node {
            id
            title
            handle
            seo {
              title
              description
            }
            body
          }
        }
      }
    }
  `;

  const data = await graphqlRequest(session, query, { first });
  return data.data.pages.edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    seo: node.seo,
    body: node.body,
  }));
}

export async function updatePageSEO(session, pageId, seoTitle, seoDescription) {
  const mutation = `
    mutation pageUpdate($input: PageInput!) {
      pageUpdate(input: $input) {
        page {
          id
          seo {
            title
            description
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const input = {
    id: pageId,
    seo: { title: seoTitle, description: seoDescription },
  };

  const data = await graphqlRequest(session, mutation, { input });

  if (data.data.pageUpdate.userErrors.length > 0) {
    throw new Error(data.data.pageUpdate.userErrors[0].message);
  }

  return data.data.pageUpdate.page;
}

/* ========== BLOG POSTS (ARTICLES) ========== */

export async function getArticles(session, blogId, first = 10) {
  const query = `
    query getArticles($blogId: ID!, $first: Int!) {
      blog(id: $blogId) {
        articles(first: $first) {
          edges {
            node {
              id
              title
              handle
              seo {
                title
                description
              }
              excerpt
            }
          }
        }
      }
    }
  `;

  const data = await graphqlRequest(session, query, { blogId, first });

  if (!data?.data?.blog) {
    throw new Error("Blog not found or invalid blogId");
  }

  return data.data.blog.articles.edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    seo: node.seo,
    excerpt: node.excerpt,
  }));
}

/* ========== THEMES ========== */

export async function getThemes(session) {
  const query = `
    query {
      themes(first: 10) {
        edges {
          node {
            id
            name
            role
            previewUrl
            createdAt
          }
        }
      }
    }
  `;

  const data = await graphqlRequest(session, query);
  return data.data.themes.edges.map(({ node }) => ({
    id: node.id,
    name: node.name,
    role: node.role,
    previewUrl: node.previewUrl,
    createdAt: node.createdAt,
  }));
}
