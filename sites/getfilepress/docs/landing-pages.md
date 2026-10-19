# Start a product landing page

Use the landing starter when a visitor needs to understand a product or service before using it:

```bash
pnpm create-site my-product --external ../my-product-site --layout landing --title "My product" --url https://my-product.example
```

The existing blog starter remains the default. The landing option writes a draft home page, selects it in the configuration, and adds a local theme. No deployment is configured unless you supply the separate hosting arguments. The draft flag adds a visible draft notice and noindex metadata, and excludes the page from the sitemap. It does not prevent building or hosting the page, so replace the prompts before publishing.

Replace the prompts in pages/home.md with a recognizable situation, the product form, a bounded result, a representative example, and one useful next action. State prerequisites beside that action. Keep illustrations distinct from observed results. Remove draft: true only after the copy and links describe your product.

The layout makes room for an example before stack labels. Existing xFacts labels stay available below the explanation. Discovery skips temporary folders named temp or tmp, along with examples, fixtures, tests, dependencies, build output, and hidden folders, so borrowed review material does not appear as a product label. The CSS uses theme variables so you can choose a product-specific palette and type. An obvious utility can lead with its working interface instead.

## Make the example do the explaining

Use one connected example with specific headings:

1. **Before:** show the input or the point where someone is stuck. “Your guide says ‘launch the app’ but never gives the command” establishes a concrete problem.
2. **Output:** show a small excerpt of what the product returns. For a review tool, that means the quoted issue, its location, consequence, and recommended change. A sentence promising “a prioritized report” is not a report example.
3. **After:** show the repaired instructions, produced file, or next decision. Identify who makes the change. If the tool only recommends an edit, label this “After you make the edit.” Do not imply it edits automatically or that a better outcome has been measured.

For example, a review might identify a missing launch command; the author then adds the command verified in the project and what successful startup looks like. Show the corrected lines. Stopping at “add the command” still leaves the visitor to imagine the benefit.

Use the pattern that fits the product. A converter can show source file → output file → where it can be used. A decision aid can show question → evidence → decision. A working timer may already demonstrate its job without a separate story. Do not invent a problem to fill three boxes.

The starter gives the worked example one location, linked by the secondary action. Avoid repeating it directly below. A linked full report should add evidence; a second on-page example should teach a different use case.

Before removing draft: true, hide the product name and generic labels such as “Useful result.” Can a reader still identify the problem, see the output, and explain what changes for them? Ask them to point to the actual before and after. Attractive formatting and a correct output filename do not answer that question.

Preview both a wide and narrow viewport, follow the first-use link, and navigate it with a keyboard before publishing.

## Carry the example into the README

People also discover a product through GitHub and its package registry. Give the public README the same plain product description, prerequisite-aware first action, and compact worked example. Reuse the site fixture or link to its complete output so the two versions stay consistent. For a visual product, include an actual screenshot with a caption that distinguishes sample data from observed behavior.

Check the rendered website, GitHub README, and packed package README together before release. A site deployment does not update npm. Confirm that the package build copies the intended README and that its image and example links work outside the repository. Keep maintainer build/deploy instructions after the reader-facing explanation.
