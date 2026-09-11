---
app_facts_version: 0.1.0
name: filepress
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

# filepress

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

[appfacts-label]: https://appfacts.dev/v#af1.eNptkkFr3DAQhf-KmLMc06tOLQulaXbbgpdSKKFM5LFWWVkS0tgbs-S_F9let4FcZ76Z9-ZJVxhBfZDgsSdQ0FlHMVHOIIGnWEp98CFRDCAhM_KQQQFqtiOBBGc1-Vyww_1xIfQZ1BUcejOgKZ3jFKnRyUaWohnJMUnxFUe81XZNI8WX42EPEtLg2c5OvoWW7p6Ljy5hT5eQzqBgmX-wPGtNznoDCnZNAxKeButaUPDTcrF2CpnXtgtD2zlMJH6gobJTO_vm2lcJLcUM6vcVPCj4mGeh51yfZ61YgkDrxT8zr3JBF3JluhQ8k2_f4Ua7UbNTwSG4rctD8m24-JUocQgd_Egp2-A3rMPM1UvvqogpU1rpX4e9KIVy7o28JPTGbUhL0YWpJ89vdQdvO0vtSunZPYuYgqa87HuUkEe9JfNOmAnUlvZt73fnsMe16YJGJz7dC3ohPfB80OP2YFeIqM9o6E-PHg2ViehjX74gZd4irvSJdMkTynfMlkOaijJzzKqujeXT8HSnQ1_vkNFNmavPIRmq9vtd_d9T_wWMmPsr
