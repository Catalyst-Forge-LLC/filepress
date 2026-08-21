---
title: Skill page
description: How to write the page that installs an agent skill folder.
order: 5
---

A skill is a folder: `SKILL.md` plus whatever that file reads. The page’s job is to get that folder into a skills directory.

This is the house shape. Live single-skill page: [aibreze.com/skill](https://aibreze.com/skill). Multi-skill variant: [temperpass.dev/install](https://temperpass.dev/install). Agent spec: [`docs/SKILL_PAGE.md`](https://github.com/Catalyst-Forge-LLC/filepress/blob/main/docs/SKILL_PAGE.md).

Do not assume the reader already has the repo, knows dest dirs, or can finish a partial path.

## Two variants

1. **Single skill** — one product folder (`skills/<name>/`). aiBreze, EmberDossier.
2. **Multi-skill** — copy **one** folder from a set (`passes/<name>/`). TemperPass. Keep the per-skill table and any “when to fire” design. Do not flatten it into a one-folder story.

Same get-the-folder steps either way.

## Required sections

This order:

1. **Lede** — the skill is a folder. Get it, then put it in a skills directory. If the product also has a project install (npm, overlay, always-on rule), say that is a different hook and link it.
2. **Download the ZIP** — one link per skill folder. Unpack; move the folder that contains `SKILL.md`. On claude.ai, skip unpacking and upload the ZIP under Settings, Customize, Skills.
3. **Clone the repo** — full `git clone` URL, then the exact folder to copy.
4. **Install from npm** — `pnpm add` the package, then the exact path under `node_modules/`.
5. **Skills directories** — Claude Code personal, Claude Code project, Cursor project and user. The dropped folder keeps the skill name and contains `SKILL.md`.
6. **What you say** — three to five example asks. What it does not run on, if that is the design.

Headings name the thing. `Download the ZIP`. `Skills directories`.

## Optional sections

After the required ones:

- Always-on Cursor rule, if you ship a pocket card that is **not** in the ZIP
- One-off raw URLs
- What it is not
- Per-skill table (multi-skill)
- Why descriptions are narrow (only if that is the product)

## ZIP

Zip root is the skill folder: `<name>/SKILL.md` plus supporting files. One ZIP per skill. Multi-skill products zip each pass separately so claude.ai can ingest one skill.

Write the ZIP from the site `dev` / `build` scripts. Always-on `cursor.mdc` stays out of the ZIP.

## Fill-in

Replace `NAME`, `ORG/REPO`, and `PKG`. For multi-skill, change the copy path to `passes/<pass>/`, list one ZIP per pass, and keep the when-to-fire table after dest dirs.

````markdown
---
title: Skill
description: Get the folder from a ZIP, a git clone, or npm.
order: 1
---

The skill is a folder: `SKILL.md` plus the files it reads. Get that folder
one of these ways, then put it in a skills directory.

## Download the ZIP

[Download NAME.zip](/skills/NAME.zip)

Unpack it. Move the `NAME` folder (the one that contains `SKILL.md`) into
a skills directory.

On claude.ai, skip unpacking. Upload the ZIP under Settings, Customize,
Skills.

## Clone the repo

```bash
git clone https://github.com/ORG/REPO.git
```

Copy `skills/NAME/` from the clone into a skills directory.

## Install from npm

```bash
pnpm add -D PKG
```

Copy `node_modules/PKG/skills/NAME/` into a skills directory.

## Skills directories

- Claude Code, every project: `~/.claude/skills/NAME/`
- Claude Code, one repo: `.claude/skills/NAME/`
- Cursor: `.cursor/skills/NAME/` or `~/.cursor/skills/NAME/`

The folder you drop in must be named `NAME` and must contain `SKILL.md`.

## What you say

- Example ask one.
- Example ask two.
- Example ask three.
````
