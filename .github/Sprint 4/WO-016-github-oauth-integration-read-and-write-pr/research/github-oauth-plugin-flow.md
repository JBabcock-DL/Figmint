# GitHub OAuth plugin flow — WO-016 research

**Ticket:** WO-016 · **Topic:** `github-oauth-plugin-flow` · **Date:** 2026-05-27

---

## Summary

Figmint’s Org build must authenticate designers to a single connected GitHub repo, persist a revocable OAuth token in `figma.clientStorage` (keyed by repo URL), read token files via `src/io/sources/github.ts`, and write PRs via `src/io/sinks/githubPR.ts` — all gated by `flags.githubOAuth` and `manifest.org.json` network access. The Community build must expose no GitHub UI and declare `networkAccess.allowedDomains: ["none"]`.

**Recommended MVP OAuth grant:** GitHub **Device Authorization Grant** (Device Flow). It requires only a public OAuth App `client_id` in the bundle (no `client_secret`, no Detroit Labs relay server), runs entirely inside the plugin UI iframe against `github.com` + `api.github.com`, and matches PRD §11.3. **Auth Code + PKCE** is viable but adds mandatory public HTTPS relay infrastructure per [Figma’s OAuth guidance](https://developers.figma.com/docs/plugins/oauth-with-plugins/); defer to v1.x unless UX feedback rejects Device Flow.

Token lifecycle belongs on the **main thread** (`figma.clientStorage`); OAuth UI and GitHub REST calls can start in the UI iframe, with tokens passed UI → main once via typed `postMessage` handlers. GitHub read parsing reuses the existing `parseTextToDocument` / `detectContract` pipeline from WO-006.

---

## Key Findings

### 1. Figma plugin OAuth constraints (Device Flow vs Auth Code + PKCE)

| Aspect | Device Flow | Auth Code + PKCE |
|--------|-------------|------------------|
| **Client secret** | Not required (`client_id` only) | Not required if token exchange stays in iframe; **relay server still required** for Figma-safe redirect handling |
| **Public HTTPS server** | Not required | **Required** — Figma desktop `window.open()` has no `window.opener`; custom URI schemes and loopback servers are blocked |
| **UX** | User opens `github.com/login/device`, enters 8-char code | Standard GitHub authorize page in browser tab |
| **Security** | PKCE N/A; poll with `device_code`; orgs may audit device-code grants | Figma recommends PKCE + read/write key relay; GitHub [added PKCE support Jul 2025](https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/) |
| **Figma iframe fit** | `window.open(verification_uri)` + poll `POST github.com/login/oauth/access_token` from UI | `window.open` → redirect to relay → poll relay with read key (Figma doc pattern) or hosted callback page |
| **Manifest domains** | `github.com`, `api.github.com` (already in `manifest.org.json`) | Same + relay hostname (would require manifest + PRD §11.3 exception) |

Figma’s generic OAuth doc assumes a **third-party relay server** with read/write keys because desktop Electron breaks `window.opener.postMessage`. GitHub Device Flow sidesteps that entirely — the only “server” is GitHub’s OAuth endpoints, which are already whitelisted.

**CORS note:** Plugin UI iframes have a `null` origin; GitHub’s OAuth token endpoints accept `Accept: application/json` POST bodies from browser contexts used by official CLI tooling. Validate in Figma desktop + browser during `/build` VQA (Figma doc explicitly requires both).

### 2. `manifest.networkAccess` — Org vs Community

Already implemented in WO-002:

```json
// manifest.org.json
"networkAccess": { "allowedDomains": ["https://api.github.com", "https://github.com"] }

// manifest.community.json
"networkAccess": { "allowedDomains": ["none"] }
```

Figma CSP-enforces this list — any fetch to a non-whitelisted host throws. Org build scripts copy `manifest.org.json` → `dist/manifest.json` via `scripts/build-org.mjs`. Community build uses `build-community.mjs` + `manifest.community.json`. No runtime bypass exists; gating is defense-in-depth alongside `flags.githubOAuth`.

### 3. Build-time feature flag — `flags.githubOAuth`

`vite.config.ts` aliases `@/config/flags` to `flags.org.ts` or `flags.community.ts` based on `BUILD_TARGET`:

| Build | `flags.githubOAuth` | `flags.buildTarget` |
|-------|---------------------|---------------------|
| Org | `true` | `'org'` |
| Community | `false` | `'community'` |

UI components (Settings tab, Connect GitHub button, repo path fields, Bootstrap “Pull from GitHub”) must wrap on `flags.githubOAuth`. Tree-shaking is not guaranteed — use explicit conditional render, not dead-code assumptions.

### 4. Token storage — `figma.clientStorage` keyed by repo URL

Per PRD §11.3, §13.1 FR-CONF-4, and ticket scope:

- **API surface:** `figma.clientStorage.getAsync` / `setAsync` / `deleteAsync` — **main thread only** ([Figma docs](https://developers.figma.com/docs/plugins/oauth-with-plugins/#saving-the-access-token-locally)).
- **Key scheme (locked for `/plan`):**
  - `figmint:github:token:<normalizedRepoUrl>` → `{ accessToken: string; scope: string; createdAt: string; tokenType?: string }`
  - `figmint:github:config:<normalizedRepoUrl>` → `{ tokensPath: string; defaultBranch?: string }` (paths per FR-CONF-5; expand in later tickets)
- **Normalization:** lowercase host, strip trailing slash, canonical form `https://github.com/{owner}/{repo}` (reject non-GitHub hosts).
- **Security posture:** clientStorage is inspectable in DevTools — acceptable per PRD §11.3; tokens are revocable, scoped, and Org-only. Never store `client_secret`. Never log token values (use `pluginLog` with redaction).
- **Revocation / disconnect:** `deleteAsync` on token + config keys; optional `DELETE` to GitHub revoking grant is best-effort (not required for MVP AC).

### 5. UI ↔ main `postMessage` contract

Existing pattern: UI sends `{ pluginMessage: { type, … } }` via `parent.postMessage(…, '*')`; main listens on `figma.ui.onmessage`. Extend with a `src/io/messages/github.ts` module (mirrors `bootstrap.ts` / `push.ts` guards, ES2017-safe type guards for main thread).

**Proposed message types:**

| Direction | Type | Purpose |
|-----------|------|---------|
| UI → main | `github/token/save` | Persist token + repo URL after OAuth completes |
| UI → main | `github/token/clear` | Disconnect repo |
| main → UI | `github/token/status` | `{ connected: boolean; repoUrl?: string; scope?: string }` on plugin open |
| UI → main | `github/contents/fetch` | `{ repoUrl, path, ref? }` — main performs authenticated fetch, returns raw text |
| main → UI | `github/contents/result` \| `github/contents/error` | File body or error string |

**Why fetch on main for reads:** keeps the access token off repeated UI↔main round trips after initial save; main-thread `fetch` is supported with `networkAccess` ([Figma network requests doc](https://developers.figma.com/docs/plugins/making-network-requests/)). UI-side `loadFromGitHub` becomes: request contents via message → receive text → `parseTextToDocument` (same as paste/file).

Figma OAuth doc caution: when UI runs on a non-null origin (only if we later embed a hosted iframe), outbound token messages must set `pluginId` and target audience `https://www.figma.com`. MVP Device Flow runs in the default null-origin plugin UI — still use typed messages, never `postMessage` raw tokens to arbitrary origins.

### 6. OAuth scopes

Ticket + PRD specify **`repo`** scope for MVP:

- **Read:** private file contents via `GET /repos/{owner}/{repo}/contents/{path}` (requires `repo` for private repos).
- **Write (PR path):** `repo` covers branch create, commit via Git Data API, and PR create.
- **Path restriction:** OAuth cannot scope to subdirectories — “configured repo paths only” is enforced in application logic (reject reads/writes outside configured paths), not via GitHub scope narrowing.
- **Future:** split read (`public_repo` / fine-grained PAT) vs write is out of scope; ticket explicitly defers GitHub App vs OAuth App tradeoff.

Register a Detroit Labs OAuth App (Org-owned) with Device Flow enabled; inject `client_id` at build time via Vite `define` / env (`GITHUB_OAUTH_CLIENT_ID`) — **not** committed to the repo.

### 7. `src/io/sources/github.ts` — read path

No file exists yet. Should mirror WO-006 port signatures:

```ts
// UI-callable after contents fetched (or wraps message round-trip internally)
export async function loadFromGitHub(
  repoUrl: string,
  path: string,
  ref?: string,
): Promise<LoadedDocument | ValidationError>;
```

Implementation sketch:

1. Validate `repoUrl` + `path` (no `..` segments, must match connected config).
2. Request file contents through main-thread GitHub API wrapper (`src/io/github/api.ts` or inline in main handler).
3. Decode base64 content from Contents API response.
4. Call `parseTextToDocument(text, { source: 'github', repoUrl, path }, metaFactory)`.
5. Add `GitHubSourceMeta` to `src/io/sources/types.ts`: `{ port: 'github'; repoUrl; path; ref?; sha?; receivedAt }`.
6. Re-export from `src/io/sources/index.ts`.

Reuse `detectContract` — no GitHub-specific detector branch needed if file is JSON tokens.

Default acceptance path: `design/tokens.json` on connected test repo.

### 8. `src/io/sinks/githubPR.ts` — write path (MVP surface)

Ticket includes a minimal PR sink in WO-016; WO-018 expands it (Sink interface, dual json+md, export sheet). MVP responsibilities:

- Input: `{ repoUrl, baseBranch, files: Array<{ path, content }>, title, body }`.
- Steps: get default branch SHA → create ref `figmint/{kind}-{date}` → create blobs → create tree → create commit → `POST /repos/{owner}/{repo}/pulls`.
- Auth: read token from clientStorage on main thread (same key as source).
- Errors: map 401 → “Reconnect GitHub”, 422 branch exists → user-facing message.

Org build only; Community build excludes module from UI paths (flag gate).

### 9. Settings UI

PRD §6.9 FR-CONF-1 / `src/ui/tabs/Settings.tsx` (stub in PRD §7.3, not yet in tree):

- Add **Settings** nav tab in `App.tsx`, rendered only when `flags.githubOAuth`.
- **Connected Repo** section: repo URL input, “Connect with GitHub” (starts Device Flow), connection status, “Disconnect”.
- **Paths** (MVP minimum): tokens source path (default `design/tokens.json`); additional FR-CONF-5 paths can stub as read-only labels until WO-042.
- On plugin open: main sends `github/token/status` so Settings + Bootstrap can show connected state.
- Bootstrap tab: optional “Pull from GitHub” when connected (uses `loadFromGitHub`).

### 10. Security checklist (PRD §11.3)

| Rule | Implementation |
|------|----------------|
| No secrets in bundle | Only `client_id` via build-time env; no `client_secret` |
| GitHub-only network | Org manifest domains; Community `none` |
| Revocable tokens | Standard GitHub OAuth App; disconnect clears clientStorage |
| No silent cross-repo access | Single connected repo; URL validated against stored config |
| Token handling | Main-thread storage; redact in logs |

---

## Recommendations

1. **Lock Device Flow for MVP** — smallest infrastructure footprint, aligns with “OAuth App, no relay server”, satisfies Org-only AC. Document upgrade path to Auth Code + PKCE + DL relay if enterprise clients reject device-code UX (PRD OQ-5).
2. **Register OAuth App before `/build`** — Detroit Labs org admin creates app, enables Device Flow, stores `client_id` in CI secret / local `.env` (gitignored), wired through `vite.config.ts` `define`.
3. **Main-thread owns secrets** — OAuth polling can live in UI; token persistence + all authenticated GitHub REST calls on main; typed messages in `src/io/messages/github.ts`.
4. **Extend `SourceMeta` union** — add `GitHubSourceMeta`; keep parser pipeline identical to paste/file.
5. **Split WO-016 vs WO-018** — WO-016 delivers OAuth + read + thin `githubPR.ts` proving one-file PR; WO-018 adds Sink interface, dual-format commits, export-sheet integration.
6. **Vitest strategy** — mock `fetch` + `figma.clientStorage` + message handlers; integration test with recorded GitHub API fixtures (no live token in CI).
7. **VQA matrix** — test OAuth + read + PR in **Figma desktop app and browser** (Figma OAuth doc requirement).

---

## Open Questions

| # | Question | Owner / resolution |
|---|----------|-------------------|
| OQ-16-1 | Has Detroit Labs registered the Figmint OAuth App (client_id + Device Flow enabled)? | Eng lead before `/build` |
| OQ-16-2 | Device Flow UX acceptable for designers vs browser-tab Auth Code flow? | Design / client feedback during VQA |
| OQ-16-3 | Should token refresh / expiry handling be implemented for GitHub Apps with expiring user tokens, or is classic OAuth App non-expiring token sufficient for MVP? | Default: OAuth App non-expiring; revisit if app type changes |
| OQ-16-4 | Exact repo URL normalization for monorepos / GitHub Enterprise (`github.company.com`) — MVP is github.com cloud only? | Confirm Org clients; GHE would need manifest domain additions |
| OQ-16-5 | Does PRD “read-only by default; write scoped to paths” (§15 risk row) imply a two-phase consent UI before first PR, or is single `repo` grant at connect acceptable? | Product — MVP follows ticket (`repo` at connect) unless overridden |
| OQ-16-6 | Where does `Settings.tsx` live relative to WO-021 feature-gating ticket — implement Settings shell here or minimal inline panel in WO-016? | Recommend minimal Settings tab in WO-016; WO-021 hardens gating audit |

---

---

## Validated evidence

### Repo inventory (grep-verified 2026-05-27)

| Path | Status | Role |
| ---- | ------ | ---- |
| `manifest.org.json` L8–10 | ✅ | `allowedDomains`: `api.github.com`, `github.com` |
| `manifest.community.json` | ✅ | `allowedDomains: ["none"]` |
| `vite.config.ts` L7–12, L20 | ✅ | `BUILD_TARGET` → `@/config/flags` alias |
| `src/config/flags.org.ts` | ✅ | `githubOAuth: true` |
| `src/config/flags.community.ts` | ✅ | `githubOAuth: false` |
| `scripts/build-org.mjs` / `build-community.mjs` | ✅ | Manifest copy → `dist/manifest.json` |
| `src/io/sources/*` | ✅ | WO-006 ingest; no `github.ts` yet |
| `src/io/github/` | ❌ greenfield | OAuth + API client |
| `src/io/sinks/githubPR.ts` | ❌ greenfield | Split WO-016 helper vs WO-018 Sink |
| `src/main.ts` L191+ | ✅ | `figma.ui.onmessage` — extend pattern |
| `src/ui/App.tsx` L22 | ✅ | Only `flags.buildTarget` consumed today |

### Figma OAuth doc vs GitHub Device Flow (tension resolved)

| Source | Claim | Implication |
| ------ | ----- | ----------- |
| [Figma OAuth with Plugins](https://developers.figma.com/docs/plugins/oauth-with-plugins/) | _"The only way to do OAuth in a Figma plugin is to run your own server on the public Internet"_ — relay with read/write keys; desktop `window.open()` has no `window.opener` | **Auth Code + PKCE** still needs Detroit Labs relay hostname in manifest |
| [GitHub Device Flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow) | Browser POST to `https://github.com/login/oauth/access_token` with `client_id` + `device_code`; **no client_secret** | Endpoints already whitelisted in Org manifest; **no Figmint relay** |
| Figma token storage doc | Access token must be saved via **`figma.clientStorage` on main thread**; UI passes token with `pluginId` + audience `https://www.figma.com` when non-null origin | Main owns secrets after initial UI poll |

**Locked interpretation:** Figma’s relay requirement applies to **redirect-based OAuth** (code in query string). GitHub Device Flow is **out-of-band authorization** (user enters code on github.com) — not contradicted by Figma’s relay pattern. Still validate CORS/null-origin POST in spikes SPK-016-1/2.

### GitHub Device Flow API contract (MVP sequence)

**Step A — Request device code**

```http
POST https://github.com/login/device/code
Accept: application/json
Content-Type: application/json

{"client_id":"<GITHUB_OAUTH_CLIENT_ID>","scope":"repo"}
```

Response (200):

```json
{
  "device_code": "…",
  "user_code": "ABCD-1234",
  "verification_uri": "https://github.com/login/device",
  "expires_in": 899,
  "interval": 5
}
```

**Step B — Poll token** (UI iframe, user gesture starts flow; polling continues with backoff on `slow_down`)

```http
POST https://github.com/login/oauth/access_token
Accept: application/json
Content-Type: application/json

{"client_id":"<id>","device_code":"…","grant_type":"urn:ietf:params:oauth:grant-type:device_code"}
```

Pending: `200` + `{"error":"authorization_pending"}` · Slow: `{"error":"slow_down"}` · Success: `{"access_token":"…","token_type":"bearer","scope":"repo"}`

**Step C — Persist** UI → main `github/token/save` → `figma.clientStorage.setAsync('figmint:github:token:' + normalizedRepoUrl, JSON.stringify({ accessToken, scope, createdAt }))`

### GitHub read (Contents API) — WO-016 AC path

```http
GET https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}
Authorization: Bearer {token}
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

Response: `content` base64, `encoding: "base64"`, `sha` — decode → `parseTextToDocument()` (same as file ingest).

---

## Decision log

| ID | Decision | Rationale | Alternatives rejected |
| -- | -------- | --------- | --------------------- |
| D-016-1 | GitHub **Device Flow** for MVP | No relay infra; `client_id` only in bundle; Org manifest already whitelists github.com | Auth Code + PKCE + DL relay (Figma doc default; adds hostname + ops) |
| D-016-2 | Token + authenticated **fetch on main thread** | Figma doc: clientStorage main-only; reduces token round-trips | All REST from UI iframe |
| D-016-3 | Storage key `figmint:github:token:<normalizedRepoUrl>` | FR-CONF-4 single connected repo | Global single key (blocks repo switch) |
| D-016-4 | Scope **`repo`** at connect | Private repo read + PR write in one grant | Split read/write scopes (deferred) |
| D-016-5 | WO-016 owns `src/io/github/*`; WO-018 owns `Sink` wrapper | Avoid duplicate PR implementations | Two competing `githubPR.ts` files |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-016-1 | Org build in **Figma desktop**: Connect flow → poll device token from UI | `access_token` received; token in clientStorage; no CSP block | ☐ pending |
| SPK-016-2 | Same flow in **Figma browser** | Same as SPK-016-1 (Figma OAuth doc requires both) | ☐ pending |
| SPK-016-3 | `GET contents` for `design/tokens.json` on test repo | JSON loads through `parseTextToDocument` | ☐ pending (after SPK-016-1) |
| SPK-016-4 | Community build: grep dist for GitHub UI strings + attempt fetch | No GitHub UI; fetch throws (manifest `none`) | ☐ pending |

---

## Risk register

| Risk | Sev | Likelihood | Mitigation |
| ---- | --- | ---------- | ---------- |
| Device Flow blocked by null-origin CSP | High | Low | SPK-016-1/2; fallback plan: Auth Code + relay |
| Designers reject device-code UX | Med | Med | Document upgrade path; design review at VQA |
| Token in clientStorage inspectable | Low | Certain | PRD §11.3 accepted; scoped + revocable |
| WO-016 vs WO-018 PR code overlap | Med | Med | D-016-5 ownership split |
| GHE (`github.enterprise.com`) | Med | Low | MVP github.com only; OQ-16-4 |

---

## References

- PRD §10.1 (Sources), §10.2 (Sinks), §11.3 (Security), §13.1 (gating), §6.9 FR-CONF
- Sprint index: [sprint-4-io-gating-research-index.md](../../research/sprint-4-io-gating-research-index.md)
- Quality bar: [research-quality-bar.md](../../../templates/research-quality-bar.md)
- [Figma — OAuth with Plugins](https://developers.figma.com/docs/plugins/oauth-with-plugins/)
- [Figma — Making Network Requests](https://developers.figma.com/docs/plugins/making-network-requests/)
- [GitHub — Authorizing OAuth Apps (Device Flow + PKCE)](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub PKCE changelog (2025-07-14)](https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/)
- Repo: `manifest.org.json`, `manifest.community.json`, `src/config/flags.*.ts`, `src/io/sources/*`, `src/main.ts`, `src/ui/App.tsx`
- WO-006 research: `io-subsystem-design.md` (port patterns, `detectContract` reuse)
