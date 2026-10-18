# Start a product landing page

Use the landing starter when a visitor needs to understand a product or service before using it:

```bash
pnpm create-site my-product --external ../my-product-site --layout landing --title "My product" --url https://my-product.example
```

The existing blog starter remains the default. The landing option writes a draft home page, selects it in the configuration, and adds a local theme. No deployment is configured unless you supply the separate hosting arguments. The draft flag adds a visible draft notice and noindex metadata, and excludes the page from the sitemap. It does not prevent building or hosting the page, so replace the prompts before publishing.

Replace the prompts in pages/home.md with a recognizable situation, the product form, a bounded result, a representative example, and one useful next action. State prerequisites beside that action. Keep illustrations distinct from observed results. Remove draft: true only after the copy and links describe your product.

The layout makes room for an example before stack labels. Existing xFacts labels stay available below the explanation. Discovery skips temporary folders named temp or tmp, along with examples, fixtures, tests, dependencies, build output, and hidden folders, so borrowed review material does not appear as a product label. The CSS uses theme variables so you can choose a product-specific palette and type. An obvious utility can lead with its working interface instead.

Preview both a wide and narrow viewport, follow the first-use link, and navigate it with a keyboard before publishing.
