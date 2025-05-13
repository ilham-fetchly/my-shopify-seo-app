import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Select,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  getProducts,
  updateProductSEO,
  getPages,
  updatePageSEO,
  getArticles,
  getBlogs,
  updateArticleSEO,
} from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const products = await getProducts(session);
  const pages = await getPages(session);
  const blogs = await getBlogs(session);
  const articles =
    blogs.length > 0 ? await getArticles(session, blogs[0].id) : [];

  return json({
    products,
    pages,
    articles,
    blogs,
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const type = formData.get("type");
  const id = formData.get("id");
  const title = formData.get("title");
  const description = formData.get("description");

  try {
    if (type === "product") {
      await updateProductSEO(session, id, title, description);
    } else if (type === "page") {
      await updatePageSEO(session, id, title, description);
    } else if (type === "article") {
      await updateArticleSEO(session, id, title, description);
    }
    return json({ status: "success" });
  } catch (error) {
    return json({ status: "error", message: error.message });
  }
};

export default function SEOEditor() {
  const { products, pages, articles, blogs } = useLoaderData();
  const submit = useSubmit();
  const [selectedType, setSelectedType] = useState("product");
  const [selectedBlog, setSelectedBlog] = useState(blogs[0]?.id || "");
  const [selectedItem, setSelectedItem] = useState(null);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [status, setStatus] = useState(null);

  const handleTypeChange = (value) => {
    setSelectedType(value);
    setSelectedItem(null);
    setSeoTitle("");
    setSeoDescription("");
  };

  const handleBlogChange = async (value) => {
    setSelectedBlog(value);
    setSelectedItem(null);
    setSeoTitle("");
    setSeoDescription("");

    // Fetch articles for the selected blog
    const formData = new FormData();
    formData.append("blogId", value);
    submit(formData, { method: "GET" });
  };

  const handleItemChange = (value) => {
    const item = [...products, ...pages, ...articles].find(
      (item) => item.id === value,
    );
    setSelectedItem(item);
    setSeoTitle(item.seo?.title || "");
    setSeoDescription(item.seo?.description || "");
  };

  const handleSubmit = () => {
    if (!selectedItem) return;

    const formData = new FormData();
    formData.append("type", selectedType);
    formData.append("id", selectedItem.id);
    formData.append("title", seoTitle);
    formData.append("description", seoDescription);

    submit(formData, { method: "POST" });
    setStatus("success");
  };

  const items = {
    product: products,
    page: pages,
    article: articles,
  };

  return (
    <Page>
      <TitleBar title="SEO Editor" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="400" align="space-between">
                  <Select
                    label="Content Type"
                    options={[
                      { label: "Products", value: "product" },
                      { label: "Pages", value: "page" },
                      { label: "Articles", value: "article" },
                    ]}
                    value={selectedType}
                    onChange={handleTypeChange}
                  />
                  {selectedType === "article" && (
                    <Select
                      label="Select Blog"
                      options={blogs.map((blog) => ({
                        label: blog.title,
                        value: blog.id,
                      }))}
                      value={selectedBlog}
                      onChange={handleBlogChange}
                    />
                  )}
                  <Select
                    label="Select Item"
                    options={items[selectedType].map((item) => ({
                      label: item.title,
                      value: item.id,
                    }))}
                    value={selectedItem?.id}
                    onChange={handleItemChange}
                  />
                </InlineStack>

                {selectedItem && (
                  <BlockStack gap="400">
                    <TextField
                      label="SEO Title"
                      value={seoTitle}
                      onChange={setSeoTitle}
                      autoComplete="off"
                    />
                    <TextField
                      label="SEO Description"
                      value={seoDescription}
                      onChange={setSeoDescription}
                      multiline={4}
                      autoComplete="off"
                    />
                    <Button primary onClick={handleSubmit}>
                      Save Changes
                    </Button>
                  </BlockStack>
                )}

                {status === "success" && (
                  <Banner status="success">
                    SEO information updated successfully!
                  </Banner>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
