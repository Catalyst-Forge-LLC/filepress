---
title: Getting started
description: Install getfilepress, scaffold a content-only site, and run the first build.
order: 1
---

FilePress ships on npm as **`getfilepress`**. The bins are `filepress` and `getfilepress` (same script). Node.js 20+ and [pnpm](https://pnpm.io).

## Shortest path

A site is a content folder plus a pin of the engine. The smallest useful tree is `filepress.config.ts` (`title` and `url` required), `posts/YYYY-MM-DD-slug.md`, and `package.json` with `"getfilepress": "^0.1.29"`.

```bash
pnpm install
pnpm build      # → ./build/
pnpm preview    # serve build/, no Genie
```

`pnpm dev` adds the Genie FAB. It is not required for the first site. Deploy means you upload `build/` to a static host. FilePress does not create that host.

The rest of this page is the scaffold if you want nav, pages, and a starter post written for you.

## Scaffold a site

From a clone of the [filepress](https://github.com/Catalyst-Forge-LLC/filepress) engine:

```bash
pnpm install
pnpm create-site my-blog --external ../my-blog \
  --title "My Blog" \
  --url https://my.blog

cd ../my-blog
pnpm install
pnpm dev      # local preview
pnpm build    # → build/
```

Or pin the published package (current is `0.1.29`):

```json
{
  "devDependencies": {
    "getfilepress": "^0.1.29"
  }
}
```

A git SHA or existing tag also works. Do not float on `main`. `link:../filepress` is local only.

The site folder stays content-only:

- `filepress.config.ts` — title, URL, nav, footer, topics, optional `homePage`, optional `theme` (`essay` | `ink` | `folio`), optional `paths`
- `posts/` — dated Markdown (`/posts/<slug>`)
- `pages/` — evergreen Markdown (`about.md` → `/about`)
- `paths` mounts — optional site-owned HTML/CSS/JS at a URL prefix
- `static/` — favicon, images, logo
- `theme.css` — optional Essay overrides
- `package.json` — `"getfilepress": "link:../filepress"` locally, or npm / git pin in CI

## Config

```ts
import { defineFilepressConfig } from 'getfilepress';

const github = 'https://github.com/acme/my-blog';

export default defineFilepressConfig({
  title: 'My Blog',
  description: 'Notes and essays.',
  url: 'https://my.blog',
  author: 'Me',
  tagline: 'Ends before means.',
  topics: [{ label: 'Essays', tag: 'essays' }],
  nav: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'GitHub', href: github, icon: 'github' }
  ],
  // Omitting footerLinks keeps the default RSS + Topics row.
  footerLinks: [
    { label: 'RSS', href: '/rss.xml' },
    { label: 'Topics', href: '/topics' },
    { label: 'GitHub', href: github, icon: 'github' }
  ]
});
```

`title` and `url` are required. Missing values fail the build with a named error.

Omit `logo` and the masthead uses `/logo.png` from `static/` if that file is there. Set `logo: ""` or `null` for a text-only title.

### Nav, footer, and icons

- `nav` — header links (defaults to Posts + Topics, or Home + Posts + Topics when `homePage` is set).
- `footerLinks` — footer row (defaults to RSS + Topics when omitted). Setting it **replaces** the default list, so keep RSS/Topics if they still belong.
- `icon: 'github'` — built-in mark beside the label; opens in a new tab. Theme class: `.nav-github` (see [`docs/THEME.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/THEME.md)).

For a product-style home (static page at `/`, posts at `/posts`), set `homePage: 'home'` and add `pages/home.md`. This site does that. `/writing` is the same listing (nav label). Old `/writing/<slug>` URLs redirect to `/posts/<slug>`. Extra rules go in config `redirects` or `static/_redirects`.

### Path mounts

Attach a site-owned HTML/CSS/JS tree at a URL prefix. FilePress serves the mount in `filepress dev` and copies it into `build/` after the Vite/Kit build. It does **not** parse Markdown or inject Essay chrome. The site owns the shell.

```ts
paths: [{ url: '/docs', dir: 'docs/dist' }]
```

- `dir` is site-relative; `url` starts with `/` and must not collide with engine routes (`posts`, `writing`, `tags`, …).
- The first URL segment is reserved against `pages/<slug>.md` (so `pages/docs.md` cannot sit next to `url: '/docs'`).
- HTML files under the mount are included in `sitemap.xml`.
- In this repo, `sites/demo` mounts `mounts/docs` at `/docs`.

## Posts

```bash
filepress new "My Post"
filepress new "My Post" --draft
```

Writes `posts/YYYY-MM-DD-my-post.md`. The file can still be created by hand.

| Field | Role |
| --- | --- |
| `title` | Required |
| `date` | Required, `YYYY-MM-DD` |
| `slug` | Optional; otherwise from the filename |
| `description` / `excerpt` | Listings and SEO |
| `tags` | YAML list, e.g. `[notes, sveltekit]` |
| `draft` | `true` hides the post from production listings and feeds |
| `updated` | Optional `YYYY-MM-DD` |
| `author` | Optional byline; otherwise the site author |

Reading time is computed (~228 wpm). It is not a frontmatter field.

Images: `static/images/posts/<slug>/photo.jpg`, referenced as `/images/posts/<slug>/photo.jpg`. A lone image plus a title attribute becomes a `<figure>`. Tokens and presets: [`docs/THEME.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/THEME.md).

## Commands

| Command | What it does |
| --- | --- |
| `filepress new "Title"` | Stamp a dated post skeleton |
| `filepress dev` | Dev server + Genie FAB |
| `filepress build` | Static `build/` |
| `filepress preview` | Serve `build/` (no Genie) |
| `filepress check` | Type-check against the site |

In the engine monorepo, pass `--site <name>` (for example `--site getfilepress`). Sibling sites use cwd. No `--site` flag.

## Next

- Ship it: [Deploy](/deploy)
- Import an existing site: [Import](/import)
- Tune look in `filepress dev`: [Genie](/genie)
- If the site ships an agent skill: [Skill page](/skill-page)
- Walkthrough posts: [Writing](/writing)
