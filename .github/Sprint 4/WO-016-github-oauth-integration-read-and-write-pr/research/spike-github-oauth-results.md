# GitHub OAuth — spike results (WO-016 research)

> **Purpose:** Validate Device Flow + `figma.clientStorage` **before** WO-016 `/plan`.  
> **Spike code:** `src/io/github/deviceFlow.ts`, `src/ui/spike/OAuthDeviceFlowSpike.tsx` (remove when WO-016 ships).

---

## Spike matrix

| Spike ID      | Layer               | Procedure                                             | Pass criteria                                    | Status        | Evidence                                                |
| ------------- | ------------------- | ----------------------------------------------------- | ------------------------------------------------ | ------------- | ------------------------------------------------------- |
| SPK-016-0     | CLI (Node)          | `npm run spike:github-oauth:probe`                    | HTTP 200 + `user_code` from `/login/device/code` | ✅ 2026-05-27 | Automated — Device Flow enabled                         |
| SPK-016-0b    | CLI full            | `npm run spike:github-oauth`                          | `access_token` after browser authorize           | ☐ pending     | Interactive — run before `/plan` if Figma spike blocked |
| SPK-016-1     | Figma **desktop**   | Relay + `npm run build` → OAuth spike panel → Connect | Token + clientStorage probe OK                   | ✅ 2026-05-27 | Figma desktop — relay + clientStorage                   |
| SPK-016-2     | Figma **browser**   | Same in figma.com                                     | Same                                             | ☐ pending     | Strongly recommended                                    |
| SPK-016-3     | API                 | `--probe-api=OWNER/REPO/path` after token             | HTTP 200 contents                                | ☐ pending     | After SPK-016-0b or SPK-016-1                           |
| ~~SPK-016-4~~ | ~~Community build~~ | N/A                                                   | N/A                                              | **cancelled** | Single-build decision (WO-021 deferred)                 |

**Gate for `/plan`:** SPK-016-0 ✅ and SPK-016-1 ✅ **met** (2026-05-27). SPK-016-2 strongly recommended before `/build` VQA.

---

## SPK-016-0 — CLI device code (automated)

```bash
npm run spike:github-oauth:probe
```

**Expected output:**

```
SPK-016-0 CLI: requesting device code…
PASS device/code — user_code: XXXX-XXXX
Open: https://github.com/login/device
PASS SPK-016-0 (--request-only): OAuth app + Device Flow enabled
```

**Failure modes:**

| Error                                  | Fix                                                     |
| -------------------------------------- | ------------------------------------------------------- |
| `device_flow_disabled`                 | Enable Device Flow on OAuth app settings                |
| `incorrect_client_credentials`         | Check `GITHUB_OAUTH_CLIENT_ID` in `.env.local`, rebuild |
| `FAIL: GITHUB_OAUTH_CLIENT_ID not set` | Fill `.env.local`, run `npm run build` for UI spike     |

### Result log

| Date       | Operator  | Result   | Notes                              |
| ---------- | --------- | -------- | ---------------------------------- |
| 2026-05-27 | Automated | **PASS** | `npm run spike:github-oauth:probe` |

---

## SPK-016-0b — CLI full authorization (interactive)

```bash
npm run spike:github-oauth
```

1. Script prints `user_code` and opens https://github.com/login/device
2. Authorize the app in browser
3. Script prints `PASS access_token — scope: repo`

Optional contents probe:

```bash
node scripts/spike-github-device-flow.mjs --probe-api=YOUR_USER/YOUR_REPO/design/tokens.json
```

(run full flow first, or use interactive prompt at end of script)

### Result log

| Date | Operator | Result | Notes |
| ---- | -------- | ------ | ----- |
|      |          |        |       |

---

## SPK-016-1 / SPK-016-2 — Figma plugin (via OAuth relay)

### Why a relay is mandatory

GitHub OAuth endpoints do **not** send `Access-Control-Allow-Origin` for browser preflight. Figma plugin UI and main thread both run with a **null origin**, so direct `fetch()` to `github.com/login/device/code` fails:

```
Access to fetch at 'https://github.com/login/device/code' from origin 'null' has been blocked by CORS policy
```

This matches [Figma OAuth with Plugins](https://developers.figma.com/docs/plugins/oauth-with-plugins/) — a **public HTTPS relay** must perform server-side GitHub calls. For local spike validation, use `scripts/github-oauth-relay.mjs` on `http://localhost:8787` with `devAllowedDomains` in `manifest.json`.

### Steps

1. Terminal A: `npm run spike:oauth-relay` (loads `GITHUB_OAUTH_CLIENT_ID` from `.env.local`)
2. Terminal B: `npm run build`
3. Figma → Plugins → Development → Import plugin from manifest → `dist/manifest.json`
4. Open plugin — yellow **WO-016 — OAuth spike** panel should show **Relay: localhost:8787 OK**
5. Click **Connect GitHub (Device Flow)**
6. Enter code at https://github.com/login/device
7. Confirm green **Token received** message
8. Click **Probe clientStorage** — should show `clientStorage OK · scope=repo · preview=gho_…`

### Record

| Environment                                 | Date       | Result          | Error (if any)                                                      |
| ------------------------------------------- | ---------- | --------------- | ------------------------------------------------------------------- |
| Figma desktop (Windows) — UI direct fetch   | 2026-05-27 | **FAIL**        | CORS — Failed to fetch                                              |
| Figma desktop (Windows) — main direct fetch | 2026-05-27 | **FAIL**        | CORS — same preflight block                                         |
| Figma desktop — relay (`localhost:8787`)    | 2026-05-27 | **PASS**        | Token received (scope: repo); clientStorage OK · preview=gho\_…BHIt |
| Figma browser (figma.com) — relay           |            | ☐ PASS / ☐ FAIL | Production relay URL TBD                                            |

**Architecture (spike):** UI → `postMessage` → main → `relayClient.ts` → `localhost:8787` → GitHub OAuth API. Token saved via `figma.clientStorage` on main thread.

**If relay check fails:** ensure relay terminal is running; manifest must include `devAllowedDomains: ["http://localhost:8787"]`; rebuild after manifest change.

---

## SPK-016-3 — Contents API read

After any successful token acquisition:

```bash
node scripts/spike-github-device-flow.mjs --probe-api=OWNER/REPO/contents/path.json
```

Or use GitHub API manually with spike token.

| Repo | Path | HTTP | Notes |
| ---- | ---- | ---- | ----- |
|      |      |      |       |

---

## Locked findings (update after spikes)

- Device Flow from **Node/CLI**: ✅ SPK-016-0 (2026-05-27)
- Device Flow from **Figma UI iframe direct fetch**: ❌ CORS blocked (2026-05-27)
- Device Flow from **Figma main thread direct fetch**: ❌ CORS blocked — same preflight failure (2026-05-27)
- Device Flow from **Figma via local OAuth relay**: ✅ SPK-016-1 (2026-05-27)
- **Production implication:** deploy HTTPS relay; in-plugin direct GitHub fetch is **not viable**
- `figma.clientStorage` round-trip via spike messages: ✅ SPK-016-1 (scope=repo, token preview confirmed)
- Contents API with `repo` scope: _pending SPK-016-3_

---

## References

- [github-oauth-plugin-flow.md](./github-oauth-plugin-flow.md)
- `scripts/spike-github-device-flow.mjs`
- `scripts/github-oauth-relay.mjs` — local dev relay (SPK-016-1)
- `src/io/github/deviceFlow.ts` — server/relay-side helpers
- `src/io/github/relayClient.ts` — plugin → relay client
