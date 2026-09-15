# LocalSlip and FilePress

Local `filepress dev` uses Vite. Without a pin, every site wants **5173**.

[LocalSlip](https://localslip.dev) names the slip. FilePress **reads** the lease. It does not claim on `dev`.

## Recipe

Lease name = site `package.json` `name` (or `FILEPRESS_LEASE`).

```bash
localslip claim detangler-site --port 5203 && filepress dev --host 0.0.0.0
```

`claim` is idempotent. FilePress then runs `localslip get <name>`. Missing CLI is not an error — Vite falls back to 5173.

Do not pass `--port` to FilePress. `localslip ls` is the port table.

`FILEPRESS_PORT` is the escape hatch (`strictPort`). Loopback only. LocalSlip `--lan` is not FilePress `--lan`.

Production `filepress build` / Pages is unchanged.
