# Theming a filepress site

filepress ships a default **Essay** theme (fonts + layout CSS in the engine).
Sites can override it the CSS Zen Garden way: keep the HTML, drop in a stylesheet.

## Adding an override

At the **site root** (next to `filepress.config.ts`), add:

- `theme.css` — plain CSS (nesting OK). Created empty on first `filepress dev` if missing.

If the file is empty/absent of rules, the default Essay look is unchanged.

Load order:

1. Engine Essay theme (`getfilepress` / `@filepress/core/theme`)
2. Named preset from config `theme` (`essay` | `ink` | `folio`) — Essay is a no-op sheet
3. Your `theme.css`

So your rules and `:root` variables override the defaults via the cascade.

```ts
export default defineFilepressConfig({
  title: 'My Site',
  url: 'https://my.site',
  theme: 'ink' // optional; default 'essay'
});
```

```css
/* theme.css — retoken example */
:root {
	--accent: #1e4d6b;
	--accent-strong: #163a52;
}

@media (prefers-color-scheme: dark) {
	:root {
		--accent: #8eb6d4;
		--accent-strong: #b0cce3;
	}
}
```

```css
/* Or restyle structure */
.post-title {
	letter-spacing: -0.03em;
}

.site-header {
	border-bottom: none;
}
```

## Design tokens (public)

Set these on `:root` (and in a `prefers-color-scheme: dark` block if you care about dark mode).

| Token | Role |
| --- | --- |
| `--font-serif` | Body / reading type |
| `--font-sans` | UI, meta, nav |
| `--font-mono` | Code |
| `--bg` | Page background |
| `--surface` | Raised surfaces |
| `--ink` | Primary text |
| `--ink-soft` | Secondary text |
| `--ink-faint` | Tertiary / chrome |
| `--rule` | Hairline borders |
| `--rule-strong` | Stronger borders |
| `--accent` | Links, emphasis |
| `--accent-strong` | Hover / stronger accent |
| `--accent-wash` | Soft accent background |
| `--measure` | Comfortable reading width |
| `--measure-wide` | Layout column (header/footer) |
| `--gap` | Page horizontal padding |
| `--radius` | Small radii (buttons, tags) |

## Structural classes (public)

Treat these as the stable styling API. Prefer overriding them (or tokens) over depending on incidental wrappers.

**Chrome:** `.wrap` · `.site-header` · `.site-id` · `.site-title` · `.site-logo` · `.site-brand-copy` · `.site-wordmark` · `.site-tagline` · `.site-nav` · `.nav-icon` · `.nav-label` · `.has-icon` · `.nav-github` · `.site-footer` · `.footer-links`

Nav and `footerLinks` entries may set `icon: 'github'`. Chrome renders the mark beside the label, opens the link in a new tab, and adds `.has-icon` / `.nav-github` for theme overrides (see product-site `theme.css` or IngotVault for a pill-style control).

**Index:** `.hero` · `.hero-lede` · `.eyebrow` · `.featured` · `.post-list` · `.post-card` · `.post-title` · `.excerpt` · `.read-more` · `.card-tags` · `.byline` · `.reading-time` · `.draft-label` · `.pager` · `.page-count` · `.empty-state` · `.error-page` · `.error-code` · `.error-actions`

The masthead carries the site identity inside one title link: optional `logo` image, then a `.site-brand-copy` stack of `.site-wordmark` (site title) and `.site-tagline`. The index hero shows the optional `lede` from site config; with no lede the hero collapses to a visually-hidden `h1` that keeps semantics.

**Post:** `.post-header` · `.draft-banner` · `.prose` · `.post-nav` · `.post-nav-label` · `.post-nav-title` · `.older` · `.newer`

**Static page:** `.static-page` · `.page-header` · `.prose` · `.draft-banner`

**Shared:** `.meta` · `.eyebrow` · `.tag-list` · `.newsletter` · `.button`

**Topics:** `.topic-group` · `.topic-posts` · `.count` · `.date`

Prose content also uses standard elements inside `.prose` (`h2`–`h4`, `a`, `img`, `figure`, `figcaption`, `blockquote`, `code`, `pre`, `table`, …).

## Tips

- Start with tokens; reach for class overrides only when layout needs to change.
- Keep specificity low so future engine CSS doesn’t fight you.
- Custom fonts: self-host under `static/` and set `--font-serif` / `--font-sans`, or `@import` in `theme.css` (third-party font URLs affect privacy/perf).

## Genie Mode (dev-only — shipped)

In `filepress dev`, a floating **Genie** control opens a design cockpit:

| Available now (M0–M2) | Notes |
| --- | --- |
| Token / structure steers | Accent, density, dark/light presets |
| Openverse stock + local upload | Hero / page background (and logo upload → config) |
| Version rail + activate | Gitignored `.filepress-genie/`; bake into `theme.css` / `static/` |
| Live inspire (1–3 URLs) | Reuses import inspire pipeline |
| Ollama refine | Optional; host + model picker; **Scan network** (ollanet); streamed chat + 10m default timeout (`FILEPRESS_OLLAMA_TIMEOUT_MS`) |
| Config patch | `lede` / `tagline` / `logo` on activate |

Hand-edited `theme.css` remains fully supported. Genie never ships in `preview` or production builds. Spec: [GENIE_MODE_SPEC.md](./GENIE_MODE_SPEC.md). Ollama optional for the LLM path; [Finetuna](https://github.com/Catalyst-Forge-LLC/finetuna) recommended for a tuned local model.
