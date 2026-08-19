# LocalBerth and FilePress

Local `filepress dev` uses Vite. Without a pin, every site wants **5173**. Two sites, or a site plus another Vite app, swap after reboot.

[LocalBerth](https://www.npmjs.com/package/localberth) (`>= 0.2.0`) names the slip. FilePress **reads** the lease. It does not claim on `dev` (so agents do not open firewall holes).

## Resolve order

1. `FILEPRESS_PORT` — escape hatch, `strictPort`.
2. `localberth get <lease>` — if the CLI is on PATH and the name exists.
3. Vite default (5173). Missing LocalBerth is not an error.

Lease name: `FILEPRESS_LEASE`, else the site `package.json` `name`, else the site folder name (`getfilepress`, `localberth-site`, `demo`).

## Claim once (setup)

Preferred house ports (do not claim 5173 for every site):

| Lease | Port |
| --- | ---: |
| `demo` | 5179 |
| `getfilepress` | 5180 |
| `aibreze-site` | 5181 |
| `ollanet-site` | 5182 |
| `ingotvault-site` | 5183 |
| `finetuna-site` | 5184 |
| `temperpass-site` | 5185 |
| `dictawhisper-site` | 5186 |
| `localberth-site` | 5187 |
| `docupuncture-site` | 5188 |

```bash
localberth claim localberth-site --port 5187
```

Or `node scripts/ensure-lease.mjs <name> <port>` from this repo (no-op without the CLI). Loopback only. LocalBerth `--lan` is not FilePress `--lan` / ollanet `--lan`.

Production `filepress build` / Pages is unchanged.
