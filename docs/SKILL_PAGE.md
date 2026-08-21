# Skill page

How to write the page that installs an agent skill. Live reference:
[aibreze.com/skill](https://aibreze.com/skill). Multi-skill variant:
[temperpass.dev/install](https://temperpass.dev/install). Public copy:
[getfilepress.com/skill-page](https://getfilepress.com/skill-page).

A skill is a **folder**: `SKILL.md` plus whatever that file reads. The
page’s job is to get that folder into a skills directory. Do not assume
the reader already has the repo, knows dest dirs, or can finish a
partial path.

## Two variants

1. **Single skill** — one product folder (`skills/<name>/`). aiBreze,
   EmberDossier.
2. **Multi-skill** — copy **one** folder from a set (`passes/<name>/`).
   TemperPass. Keep the per-skill table and any “when to fire” design.
   Do not flatten it into a one-folder story.

Same get-the-folder steps either way.

## Required sections (this order)

1. **Lede** — the skill is a folder. Get it, then put it in a skills
   directory. One or two sentences. If the product also has a project
   install (npm + overlay + always-on rule), say that is a different
   hook and link it.
2. **Download the ZIP** — one link per skill folder. Unpack; move the
   folder that contains `SKILL.md`. On claude.ai, skip unpacking and
   upload the ZIP under Settings, Customize, Skills. Multi-skill: zip
   each skill as its own archive (zip root = that folder name). That
   matches how claude.ai ingests a skill.
3. **Clone the repo** — full `git clone https://github.com/…` URL.
   Then the exact folder to copy (`skills/<name>/` or `passes/<name>/`).
4. **Install from npm** — `pnpm add` the package, then the exact path
   under `node_modules/<pkg>/…`.
5. **Skills directories** — Claude Code personal, Claude Code project,
   Cursor project and user. The dropped folder must keep the skill name
   and contain `SKILL.md`.
6. **What you say** — three to five example asks. What it does **not**
   run on, if that is part of the design.

Headings name the thing (`Download the ZIP`, `Skills directories`).
Not riddle labels.

## Optional sections (after the required ones)

- **Always-on Cursor rule** — only if you ship a pocket card that is
  **not** in the ZIP. Separate download + dest path.
- **One-off** — raw `SKILL.md` / supporting file URLs. Same files, no
  install.
- **What it is not** — one short block when the product is easy to
  oversell (format vs crawler, protocol vs “just ask”).
- **Per-skill table** — multi-skill only. Name, path, when it fires.
- **Why descriptions are narrow** — TemperPass-style design note. Keep
  it if that is the product. Do not add it to a single auto-skill.

## Do not

- Start at npm and assume dest dirs.
- Write “copy it from” with a partial path.
- Put recovery CLIs, gitignore facts, or sync-script names on the
  product page.
- Use corporate we or builder I. The product speaks (aiBreze / it,
  EmberDossier / it, TemperPass / it).
- Add a scene to satisfy essay law. This is a reference page.

## ZIP and static

Build a STORE zip (no compression) with the skill folder as the zip
root: `<name>/SKILL.md`, plus supporting files. Write it to
`site/static/skills/<name>.zip` in the site `dev` / `build` scripts.
Gitignore the generated `site/static/skills/` tree if you also copy
raw files there.

`cursor.mdc` / always-on rules stay out of the skill ZIP.

Reference implementation: `aibreze/scripts/sync-skill-static.mjs`.

## Fill-in

Copy the template on [getfilepress.com/skill-page](https://getfilepress.com/skill-page)
and replace the placeholders. Single-skill live page: aiBreze `/skill`.
Multi-skill live page: TemperPass `/install`.
