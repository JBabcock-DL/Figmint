---
type: work-order
github_issue: 19
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JCY
---

## Goal

Add GitHub OAuth as a first-class input source AND output sink (PR creation), gated to the Org build per PRD §13.1. Designer authenticates once per repo; plugin can read `tokens.json` and write PR commits.

PRD anchors: `Docs/PRD.md` §10 (Sources/Sinks), §13.1 (feature gating), §11.3 (Security).

---

## Problem story

Org-tier Figmint engagements assume a connected consumer repo (`tokens.json`, drift reports, Code Connect stubs). Today the plugin only accepts paste / file / clipboard input (WO-006) — designers must manually copy repo files into the plugin, and nothing writes back to GitHub. Without OAuth, the Sync tab, component import, and PR sinks in PRD §10 cannot ship. This ticket adds the authentication + storage foundation so a designer connects one repo once, pulls token files deterministically, and opens an engineer-reviewable PR — Community build users never see GitHub affordances.

## User stories

- As an Org build designer, I connect my team's GitHub repo once in Settings so I don't re-paste `tokens.json` every session.
- As an Org build designer, I pull `design/tokens.json` from the connected repo into Bootstrap without leaving Figmint.
- As an Org build designer, I open a PR with a single file change so engineering can review and merge token updates.
- As a Community build designer, I never see GitHub connect UI or network calls to GitHub.

---

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).** Settings / Connect UI follows existing Bootstrap tab patterns in `src/ui/App.tsx` (inline styles, small plugin panel).

---

## Requirements

### Functional

1. **OAuth (Org, UI iframe):** GitHub **Device Authorization Grant** for MVP — `client_id` only (no `client_secret`, no relay server). User opens `github.com/login/device`, enters the user code; UI polls `github.com/login/oauth/access_token` until authorized or timeout. Auth Code + PKCE deferred to v1.x (requires public HTTPS relay per Figma OAuth docs).
2. **Scopes:** Request `repo` at connect time (read private files + create branches/commits/PRs). Enforce configured paths in app logic — OAuth cannot scope to subdirectories.
3. **Token storage (main thread):** After OAuth, UI sends token to main via typed `postMessage`; main persists in `figma.clientStorage` at `figmint:github:token:<normalizedRepoUrl>`. Config (paths) at `figmint:github:config:<normalizedRepoUrl>`. Disconnect deletes both keys.
4. **`src/io/messages/github.ts`:** Typed UI ↔ main messages (`github/token/save`, `github/token/clear`, `github/token/status`, `github/contents/fetch`, result/error). ES2017-safe guards for `main.ts`.
5. **`src/io/sources/github.ts`:** `loadFromGitHub(repoUrl, path, ref?)` → `LoadedDocument | ValidationError`; fetches via main-thread GitHub Contents API, decodes base64, runs existing `parseTextToDocument` / `detectContract` pipeline. Add `GitHubSourceMeta` to `src/io/sources/types.ts` and re-export from `index.ts`.
6. **`src/io/sinks/githubPR.ts` (MVP):** Given token + `{ repoUrl, baseBranch, files[], title, body }`, create branch, commit one or more files, open PR via GitHub REST API. WO-018 extends with Sink interface + dual json/md.
7. **Settings UI:** New Settings tab (when `flags.githubOAuth`) — Connected Repo URL, Connect / Disconnect, tokens path (default `design/tokens.json`), connection status on open.
8. **Feature gating:** `flags.githubOAuth === true` only in Org build (`src/config/flags.org.ts`). Community build hides all GitHub UI; `manifest.community.json` keeps `allowedDomains: ["none"]`.
9. **Build config:** Inject `GITHUB_OAUTH_CLIENT_ID` at build time (Vite `define` / env) — never commit secrets.

### Visual / UX

- Settings tab matches Bootstrap tab chrome (header, nav, inline styles).
- Device Flow: show user code + “Open GitHub” link + polling spinner; clear success / error / timeout states.
- Disconnect confirms before clearing stored token.

### Technical / architectural

- **Lift reference (DesignOps-plugin):** _None — new code designed in PRD._
- **Network:** Org manifest already allows `https://github.com` + `https://api.github.com` only (PRD §11.3).
- **VQA:** Test OAuth + read + PR in Figma **desktop app and browser** (Figma OAuth doc requirement).
- **Dependencies:** WO-002 (dual manifest, flags, scaffold)

---

## Acceptance criteria _(definition of done)_

- [ ] Device Flow OAuth completes end-to-end against a test repo (desktop + browser).
- [ ] Plugin reads `design/tokens.json` from a connected repo into a valid `LoadedDocument`.
- [ ] Plugin opens a PR with a single file change against a connected repo.
- [ ] Token persists across plugin re-opens; Disconnect clears stored token and shows disconnected state.
- [ ] Community build shows no GitHub UI; org build shows Settings connect affordances.
- [ ] No `client_secret` or other secrets in committed bundle / repo.

## Out of scope

- Per-file granular OAuth (one grant per repo; path restriction is app-level).
- GitHub App vs OAuth App tradeoff (OAuth App for MVP; revisit).
- Multi-repo simultaneous connections (single connected repo per project for now).
- Auth Code + PKCE + Detroit Labs relay server (v1.x / OQ-5).
- Unified export sheet UI (WO-020) and full Sink interface polish (WO-018).

---

## Testing & verification

### Functional QA

- Vitest: mock `fetch`, `clientStorage`, message handlers for OAuth state machine, `loadFromGitHub`, `githubPR` happy path + 401/422 errors.
- Manual VQA against a test repo with Org build in Figma desktop + browser.

### Visual / design QA

- Settings connect / disconnect / error states readable in 420×520 plugin panel.

### Accessibility

- Connect button and user-code display keyboard-accessible; status messages announced via live region or visible text.

### Telemetry / observability

- `console.debug` / `pluginLog` for connect, fetch, PR events (redact tokens).

---

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket)

---

## 🔍 Ready for `/research`

- [x] [GitHub OAuth plugin flow](research/github-oauth-plugin-flow.md) — Device Flow vs PKCE, storage, messages, scopes, gating.

## 📋 Ready for `/plan`

- Dependencies: WO-002.
- `/plan` should lock: Device Flow MVP, clientStorage key schema, message types, OAuth App registration blocker.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.
- **Blocker:** Detroit Labs OAuth App `client_id` must exist before build VQA.

## References

- PRD: `Docs/PRD.md` §10 (Sources/Sinks), §13.1 (feature gating), §11.3 (Security), §6.9 FR-CONF
- Research: [GitHub OAuth plugin flow](research/github-oauth-plugin-flow.md)
- Lift reference: _None — new code designed in PRD._
- Repo: `manifest.org.json`, `manifest.community.json`, `src/config/flags.*.ts`, `src/io/sources/*`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
