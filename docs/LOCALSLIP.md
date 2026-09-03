# LocalSlip and FilePress

Local `filepress dev` uses Vite. Without a pin, every site wants **5173**. Two sites, or a site plus another Vite app, swap after reboot.

[LocalSlip](https://www.npmjs.com/package/localslip) names the slip. FilePress **reads** the lease. It does not claim on `dev` (so agents do not open firewall holes).

## Resolve order

1. `FILEPRESS_PORT` — escape hatch, `strictPort`.
2. `localslip get <lease>` — if the CLI is on PATH and the name exists.
3. Vite default (5173). Missing LocalSlip is not an error.

Lease name: `FILEPRESS_LEASE`, else the site `package.json` `name`, else the site folder name (`getfilepress`, `localslip-site`, `demo`).

## Claim once (setup)

Preferred house ports (do not claim 5173 for every site):

| Lease | Port |
| --- | ---: |
| `demo` | 5179 |
| `getfilepress` | 5180 |
| `smellcheck-site` | 5181 |
| `ollanet-site` | 5182 |
| `ingotvault-site` | 5183 |
| `finetuna-site` | 5184 |
| `temperpass-site` | 5185 |
| `dictawhisper-site` | 5186 |
| `localslip-site` | 5187 |
| `docupuncture-site` | 5188 |
| `what-over-how` | 5189 |
| `nthorderthinker` | 5190 |
| `terrain-triad-theory` | 5191 |
| `mohanrao` | 5192 |
| `mohanrao-downpress` | 5194 |
| `forgetrail-site` | 5195 |
| `ember-dossier-site` | 5196 |
| `mediatuna-site` | 5197 |
| `acmegeek` | 5199 |

```bash
localslip claim localslip-site --port 5187
```

Or `node scripts/ensure-lease.mjs <name> <port>` from this repo (no-op without the CLI). Loopback only. LocalSlip `--lan` is not FilePress `--lan` / ollanet `--lan`.

Production `filepress build` / Pages is unchanged.
