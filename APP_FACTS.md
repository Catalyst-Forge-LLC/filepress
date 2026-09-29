---
app_facts_version: 0.1.0
name: FilePress
type: monorepo
status: active
license: MIT
repository: https://github.com/Catalyst-Forge-LLC/filepress
stack:
  language: "TypeScript, Svelte, JavaScript, CSS, HTML"
  runtime: Node.js
  framework: SvelteKit
  styling: CSS
  build: Vite
  hosting: Cloudflare Pages
  cli: filepress
key_dependencies:
  - name: "@sveltejs/kit"
    purpose: main framework
  - name: svelte
    purpose: frontend framework
  - name: vite
    purpose: build tool
  - name: turndown
    purpose: HTML conversion
  - name: fast-xml-parser
    purpose: XML parsing
  - name: wrangler
    purpose: deployment tool
  - name: unified
    purpose: content processing
services:
  - name: Cloudflare Pages
    role: hosting
  - name: Ollama
    role: local AI execution
build:
  package_manager: pnpm
  test: svelte-check
  ci: unknown
generated:
  date: 2026-08-28
  generator: "appfacts-cli v0.1.0 (ollama:gemma4:12b)"
  inputs_fingerprint: 639186f958222b98
credits:
  generated_with: https://appfacts.dev
  built_by: "Catalyst Forge — https://www.catalystforge.com/"
---

# FilePress

`monorepo` · **active** · MIT

Curated stack label for this repository — aimed at an under-a-minute skim.

**[Open visual label →][appfacts-label]** · or scan `APP_FACTS.png`

[Repository](https://github.com/Catalyst-Forge-LLC/filepress)

### Stack

| Layer | Choice |
| --- | --- |
| Language | TypeScript, Svelte, JavaScript, CSS, HTML |
| Runtime | Node.js |
| Framework | SvelteKit |
| Styling | CSS |
| Build | Vite |
| Hosting | Cloudflare Pages |
| CLI | filepress |

### Key dependencies

- `@sveltejs/kit` — main framework
- `svelte` — frontend framework
- `vite` — build tool
- `turndown` — HTML conversion
- `fast-xml-parser` — XML parsing
- `wrangler` — deployment tool
- `unified` — content processing

### Services

- **Cloudflare Pages** — hosting
- **Ollama** — local AI execution

### Build

- **Package Manager** — pnpm
- **Test** — svelte-check

---
*Generated with [AppFacts](https://appfacts.dev) · Built by [Catalyst Forge](https://www.catalystforge.com/) · [Visual label][appfacts-label]*

[appfacts-label]: https://appfacts.dev/v#af1.eNptkkFr3DAQhf-KmLMc06tOLQuhaXfbgJdSKKFM5LFWWVkS0tgbs-S_F9let4VcZ76Z9-ZJVxhBfZDgsSdQcG8dPSbKGSTwFEupDz4kigEkZEYeMihAzXYkkOCsJp8Ldng4LoQ-g7qCQ28GNKVznCI1OtnIUjQjOSYpvuCIt9quaaT4fDzsQUIaPNvZybfQ0t1L8dEl7OkS0hkULPNfLc9ak7PegIJd04CE58G6FhT8sFysnULmte3C0HYOE4lHNFR2amdBQWcdxfnaNwktxQzq1xU8KPiYZ6GXXJ9nrViCQOvFXzNvckEXcmW6FDyTb9_hRrtRs1PBIbity0Pybbj4lShxCB38SCnb4Desw8zVa--qiClTWumfh70ohXLujbwk9MZtSEvRhaknz__rDt52ltqV0rN7FjEFTXnZ9yQhj3pL5p0wE6gt7dve785hj2vTBY1OfHoQ9Ep64Pmgp-3BrhBRn9HQ7x49GioT0ce-fEHKvEVc6RPpkieU75gthzQVZeaYVV0by6fh-U6Hvt4ho5syV_chGar2-139z1P_AdQJ-us
