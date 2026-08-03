# Theming a Downpress site

Downpress ships a default **Essay** theme (fonts + layout CSS in the engine).
Sites can override it the CSS Zen Garden way: keep the HTML, drop in a stylesheet.

## Adding an override

At the **site root** (next to `downpress.config.ts`), add either:

- `theme.css` — preferred; plain CSS (nesting OK)
- `theme.scss` — optional; compiled at build time if present

If both exist, **`theme.css` wins**. If neither exists, the default Essay look is unchanged.

Load order:

1. Engine Essay theme (`downpress` / `@downpress/core/theme`)
2. Your `theme.css` / `theme.scss`

So your rules and `:root` variables override the defaults via the cascade.

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

**Chrome:** `.wrap` · `.site-header` · `.site-id` · `.site-title` · `.site-logo` · `.site-tagline` · `.site-nav` · `.site-footer` · `.footer-links`

**Index:** `.hero` · `.hero-lede` · `.eyebrow` · `.featured` · `.post-list` · `.post-card` · `.post-title` · `.excerpt` · `.read-more` · `.card-tags` · `.byline` · `.draft-label` · `.pager` · `.page-count` · `.empty-state`

The masthead carries the site identity: the title (or a `logo` image from site config, rendered inside the title link with the title as alt text) with the tagline beneath it. The index hero shows the optional `lede` from site config; with no lede the hero collapses to a visually-hidden `h1` that keeps semantics.

**Post:** `.post-header` · `.draft-banner` · `.prose` · `.post-nav` · `.post-nav-label` · `.post-nav-title` · `.older` · `.newer`

**Static page:** `.static-page` · `.page-header` · `.prose` · `.draft-banner`

**Shared:** `.meta` · `.eyebrow` · `.tag-list` · `.newsletter` · `.button`

**Topics:** `.topic-group` · `.topic-posts` · `.count` · `.date`

Prose content also uses standard elements inside `.prose` (`h2`–`h4`, `a`, `img`, `figure`, `figcaption`, `blockquote`, `code`, `pre`, `table`, …).

## Tips

- Start with tokens; reach for class overrides only when layout needs to change.
- Keep specificity low so future engine CSS doesn’t fight you.
- Custom fonts: self-host under `static/` and set `--font-serif` / `--font-sans`, or `@import` in `theme.css` (third-party font URLs affect privacy/perf).

## Assistant Mode (planned)

For a **local, dev-only** loop that steers tokens/structure/images via versions and bakes into `theme.css` on activate/build, see [ASSISTANT_MODE_SPEC.md](./ASSISTANT_MODE_SPEC.md). Hand-edited `theme.css` remains fully supported; Assistant Mode is optional authoring chrome, never shipped in preview or production builds.
