# Plan — WO-016: GitHub OAuth integration (read + write PR foundation)

## Approach

Promote WO-016 **research spike** into durable GitHub integration: **Device Flow UX** with **mandatory HTTPS relay** for every GitHub HTTP call from Figma (SPK-016-1 — direct fetch fails CORS on UI and main). Token persistence on **main thread** via `figma.clientStorage`. Settings tab for connect/disconnect. **`loadFromGitHub`** read path reusing WO-006 ingest. Thin **`src/io/github/createPullRequestFlow.ts`** for Git Data API (WO-018 wraps as Sink).

**Remove** spike UI (`OAuthDeviceFlowSpike`, `spike/oauth/*`, `githubOAuthSpike.ts`) after Settings flow works.

**Single build** — `flags.githubOAuth === true`; WO-021 Community gating deferred.

**WO-018 owns** `src/io/sinks/githubPR.ts` — do not create Sink in this ticket.

---

## Acceptance criteria traceability

| Ticket AC                                  | Plan steps                         |
| ------------------------------------------ | ---------------------------------- |
| Device Flow E2E desktop + browser          | Steps 5–6, 10–11, 22               |
| Read `design/tokens.json` → LoadedDocument | Steps 7–9, 14                      |
| Open PR single file                        | Steps 15–16                        |
| Token persist + Disconnect                 | Steps 3, 6, 10                     |
| No secrets in bundle                       | Steps 17–18, 21                    |
| Community gating AC                        | **N/A** single build — note in VQA |

---

## Steps

- [x] **Step 1** — Extend `src/io/github/relayClient.ts` (promote from spike):

```ts
const DEFAULT_RELAY = 'http://localhost:8787';

function relayBase(): string; // import.meta.env.FIGHUB_OAUTH_RELAY_URL || DEFAULT

export async function requestDeviceCodeViaRelay(scope: string): Promise<DeviceCodeResponse>;
export async function pollDeviceTokenViaRelay(deviceCode: string): Promise<DeviceTokenPollResult>;
export async function probeRelayHealth(): Promise<boolean>;

export async function githubApiViaRelay(
  method: 'GET' | 'POST' | 'PATCH',
  apiPath: string,
  token: string,
  body?: unknown,
): Promise<{ status: number; ok: boolean; body: unknown }>;
// POST to relay e.g. /github/api/proxy with { method, path, token, body }
// OR extend scripts/github-oauth-relay.mjs with generic proxy route
```

- **Extend `scripts/github-oauth-relay.mjs`** with `POST /github/api/proxy` forwarding to `https://api.github.com{path}` with Authorization header — plugin never calls api.github.com directly.
- **Done when:** `tests/unit/io/github/relayClient.test.ts` mocks fetch; no `fetch('https://github.com` in `src/`.

- [x] **Step 2** — Implement `src/io/github/repoUrl.ts`:

```ts
export function normalizeRepoUrl(input: string): string;
// trim, lowercase hostname, strip trailing slash
// must match /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/
// return https://github.com/{owner}/{repo}

export function parseOwnerRepo(normalizedUrl: string): { owner: string; repo: string };

export function tokenStorageKey(repoUrl: string): string;
// 'fighub:github:token:' + normalizeRepoUrl(repoUrl)

export function configStorageKey(repoUrl: string): string;
// 'fighub:github:config:' + normalizeRepoUrl(repoUrl)
```

- Reject `github.enterprise.com` for MVP.
- **Done when:** `tests/unit/io/github/repoUrl.test.ts` — 5 valid + 3 invalid URLs.

- [x] **Step 3** — Implement `src/io/github/storage.ts`:

```ts
export interface StoredGitHubToken {
  accessToken: string;
  scope: string;
  createdAt: string;
  tokenType?: string;
}

export interface StoredGitHubConfig {
  tokensPath: string; // default design/tokens.json
  defaultBranch?: string;
  exportBasePath?: string; // for WO-018
}

export async function getToken(repoUrl: string): Promise<StoredGitHubToken | null>;
export async function setToken(repoUrl: string, token: StoredGitHubToken): Promise<void>;
export async function clearToken(repoUrl: string): Promise<void>;
export async function getConfig(repoUrl: string): Promise<StoredGitHubConfig | null>;
export async function setConfig(repoUrl: string, config: StoredGitHubConfig): Promise<void>;
```

- Wrap `figma.clientStorage.getAsync/setAsync/deleteAsync`.
- **Done when:** Vitest figma.clientStorage mock round-trip.

- [x] **Step 4** — Create `src/io/messages/github.ts` (replace spike types):

**UI → main:**

```ts
export interface GitHubOAuthStartMessage {
  type: 'github/oauth/start';
  requestId: string;
  scope: string;
}
export interface GitHubOAuthPollMessage {
  type: 'github/oauth/poll';
  requestId: string;
  deviceCode: string;
}
export interface GitHubTokenSaveMessage {
  type: 'github/token/save';
  repoUrl: string;
  accessToken: string;
  scope: string;
}
export interface GitHubTokenClearMessage {
  type: 'github/token/clear';
  repoUrl: string;
}
export interface GitHubTokenProbeMessage {
  type: 'github/token/probe';
  repoUrl: string;
}
export interface GitHubContentsFetchMessage {
  type: 'github/contents/fetch';
  requestId: string;
  repoUrl: string;
  path: string;
  ref?: string;
}
```

**Main → UI:**

```ts
export interface GitHubOAuthDeviceCodeMessage {
  type: 'github/oauth/device-code';
  requestId: string;
  ok: boolean;
  device?: DeviceCodeResponse;
  error?: string;
}
export interface GitHubOAuthPollResultMessage {
  type: 'github/oauth/poll-result';
  requestId: string;
  result: DeviceTokenPollResult;
}
export interface GitHubTokenStatusMessage {
  type: 'github/token/status';
  repoUrl: string;
  connected: boolean;
  scope?: string;
  tokenPreview?: string;
  tokensPath?: string;
}
export interface GitHubContentsResultMessage {
  type: 'github/contents/result';
  requestId: string;
  text: string;
  sha?: string;
}
export interface GitHubContentsErrorMessage {
  type: 'github/contents/error';
  requestId: string;
  message: string;
}
export interface GitHubErrorMessage {
  type: 'github/error';
  message: string;
}
```

- Export guards for every type — pattern from `src/io/messages/bootstrap.ts`.
- **Done when:** `tests/unit/io/messages/github.test.ts` ≥3 valid + 2 invalid per guard.

- [x] **Step 5** — Implement `src/io/github/oauth.ts`:

```ts
export async function startDeviceFlow(scope: string): Promise<DeviceCodeResponse>;
export async function pollDeviceFlow(deviceCode: string): Promise<DeviceTokenPollResult>;
```

- Delegate to relayClient only.
- **Done when:** unit tests with mocked relay JSON.

- [x] **Step 6** — Wire `src/main.ts` GitHub handlers (replace `spike/oauth/*` block):

| Message                 | Handler                                            |
| ----------------------- | -------------------------------------------------- |
| `github/oauth/start`    | relay device code → `github/oauth/device-code`     |
| `github/oauth/poll`     | relay poll → `github/oauth/poll-result`            |
| `github/token/save`     | `setToken` + `setConfig` + `github/token/status`   |
| `github/token/clear`    | `clearToken` + delete config + status disconnected |
| `github/token/probe`    | read storage → status                              |
| `github/contents/fetch` | contents API via relay → result/error              |

- `tokenPreview`: first 4 + `…` + last 4 chars only.
- **Done when:** SPK-016-1 regression from Settings (Step 11), not spike panel.

- [x] **Step 7** — Implement `src/io/github/contents.ts`:

```ts
export async function fetchRepoFileContents(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<{ text: string; sha: string }>;
```

- Relay GET `/repos/{owner}/{repo}/contents/{path}?ref=`
- Decode base64 `content` (handle `\n` in GitHub response)
- Map 401 → throw `GitHubAuthError`; 404 → `GitHubNotFoundError`
- **Done when:** test with fixture base64 body.

- [x] **Step 8** — Extend `src/io/sources/types.ts`:

```ts
export interface GitHubSourceMeta {
  port: 'github';
  repoUrl: string;
  path: string;
  ref?: string;
  sha?: string;
  receivedAt: string;
}
```

- Add to `SourceMeta` union; export from `src/io/sources/index.ts`.

- [x] **Step 9** — Implement `src/io/sources/github.ts`:

```ts
export async function loadFromGitHub(
  repoUrl: string,
  path: string,
  ref?: string,
): Promise<LoadedDocument<unknown> | ValidationError>;
```

- UI implementation: post `github/contents/fetch`, await result, call `parseTextToDocument(text, metaFactory)` same as paste.
- Validate path: reject `..` segments.
- **Done when:** test loads tokens JSON fixture path from mocked contents response.

- [x] **Step 10** — Implement `src/ui/tabs/Settings.tsx`:

**State:** `repoUrl`, `tokensPath` (default `design/tokens.json`), `connectionStatus`, `oauthPhase: 'idle'|'code'|'polling'|'error'`.

**UI blocks:**

1. Repo URL text input
2. Tokens path input
3. Connect button → starts Device Flow via main
4. User code display + link `<a href={verification_uri} target="_blank">`
5. Disconnect button (confirm `window.confirm`)
6. Status line (`role="status"`)
7. Relay warning banner when `probeRelayHealth()` false

**Styles:** match `Bootstrap.tsx` — 11px body, 13px section headers, `#666` muted.

- **Done when:** renders at 420×520 without overflow on idle state.

- [x] **Step 11** — Implement `src/ui/github/useGitHubConnect.ts` hook:
  - Pending request map for `requestId` (copy pattern from spike `OAuthDeviceFlowSpike.tsx` but durable types from `github.ts`).
  - Poll loop: respect `interval` / `slow_down` / deadline from device code.
  - On success: post `github/token/save` with repoUrl from Settings form.
  - **Done when:** E2E manual Connect works with relay running.

- [x] **Step 12** — Update `src/ui/App.tsx`:
  - Add nav button **Settings** alongside Bootstrap (use local `useState` tab: `'bootstrap' | 'settings'`).
  - Render `<Settings />` when active.
  - **Remove** `<OAuthDeviceFlowSpike />` (Step 20).

- [x] **Step 13** — Optional read smoke in Settings:
  - Button "Test read tokens path" → `loadFromGitHub` → show `Loaded {kind}` or error.
  - **Done when:** manual read works against connected repo.

- [x] **Step 14** — Implement `src/io/github/createPullRequestFlow.ts`:

```ts
export interface PullRequestFile {
  path: string;
  content: string;
}

export interface CreatePullRequestOptions {
  token: string;
  owner: string;
  repo: string;
  baseBranch: string;
  headBranch: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
  files: PullRequestFile[];
}

export interface CreatePullRequestResult {
  prUrl: string;
  prNumber: number;
  headBranch: string;
}

export async function createPullRequestFlow(
  opts: CreatePullRequestOptions,
): Promise<CreatePullRequestResult>;
```

**Sequence (all via relay proxy):**

1. GET `/repos/{owner}/{repo}` — validate
2. GET `/repos/{owner}/{repo}/git/ref/heads/{baseBranch}` → baseSha
3. GET `/repos/{owner}/{repo}/git/commits/{baseSha}` → treeSha
4. POST `/repos/{owner}/{repo}/git/refs` — head branch
5. For each file: POST `/git/blobs` encoding utf-8
6. POST `/git/trees` with tree entries mode 100644
7. POST `/git/commits`
8. PATCH `/git/refs/heads/{headBranch}`
9. POST `/pulls`

- **Done when:** `tests/unit/io/github/createPullRequestFlow.test.ts` asserts call order with mocked relay.

- [x] **Step 15** — Implement `src/io/github/prBody.ts` + `branchName.ts` (shared with WO-018):
  - `buildDefaultHeadBranch(contractKind, dateUtc)` → `fighub/{kind}-{yyyy-MM-dd}`
  - `buildPrBody(...)` per research template

- [x] **Step 16** — Settings "Open test PR" dev action (or unit-only if no UI time):
  - Single file `docs/fighub/test-export.v1.json` commit to prove WO-016 AC.
  - **Done when:** manual PR opened on test repo OR full mock test only + VQA note.

- [x] **Step 17** — Update `manifest.json`:

```json
"networkAccess": {
  "allowedDomains": ["https://YOUR-PRODUCTION-RELAY.example.com"],
  "devAllowedDomains": ["http://localhost:8787"],
  "reasoning": "GitHub OAuth + API via FigHub relay (CORS-safe). Direct github.com blocked in plugin sandbox."
}
```

- Remove direct `https://github.com/login/` from allowedDomains if all traffic goes through relay (login happens in user browser, not plugin fetch).

- [x] **Step 18** — Update `vite.config.ts` `sharedDefine`:

```ts
'import.meta.env.FIGHUB_OAUTH_RELAY_URL': JSON.stringify(env.FIGHUB_OAUTH_RELAY_URL ?? ''),
```

- Add to `src/vite-env.d.ts` interface.
- Update `.env.example`.

- [x] **Step 19** — Extend relay script `scripts/github-oauth-relay.mjs`:
  - `POST /github/api/proxy` body `{ method, path, token, body? }`
  - Forward to `https://api.github.com` + standard headers
  - **Done when:** curl through proxy returns repo JSON.

- [x] **Step 20** — Delete spike artifacts:
  - Remove `src/ui/spike/OAuthDeviceFlowSpike.tsx`
  - Remove `src/io/messages/githubOAuthSpike.ts`
  - Remove spike handlers from `src/main.ts`
  - Keep `src/io/github/deviceFlow.ts` if used by relay tests CLI only; else move types to `oauth.ts`
  - **Done when:** `rg spike/oauth src/` → empty.

- [x] **Step 21** — Test suite `tests/unit/io/github/`:
  - `repoUrl.test.ts`, `storage.test.ts`, `contents.test.ts`, `relayClient.test.ts`, `createPullRequestFlow.test.ts`, `oauth.test.ts`
  - **Done when:** no raw tokens in snapshots (`grep gho_ tests/` only in redacted previews).

- [x] **Step 22** — Manual VQA matrix:

| Env           | Steps             | Record in                                 |
| ------------- | ----------------- | ----------------------------------------- |
| Figma desktop | Connect, read, PR | `spike-github-oauth-results.md` SPK-016-2 |
| Figma browser | Connect only      | same                                      |

- [x] **Step 23** — CI: `npm run typecheck && npm run lint && npm run test && npm run build`; `rg client_secret src/` empty.

---

## Build Agents

### Phase 1 (sequential)

- `code-build` — **Steps 1–3**: relay + proxy route, repoUrl, storage.

### Phase 2 (parallel)

- `code-build` — **Steps 4–6**: messages, oauth, main handlers.
- `code-build` — **Steps 7–9**: contents + github source loader.

### Phase 3 (parallel)

- `code-build` — **Steps 10–13**: Settings UI + connect hook + App nav.
- `code-build` — **Steps 14–16**: PR flow + helpers + smoke.

### Phase 4 (sequential)

- `code-build` — **Steps 17–20**: manifest, vite, relay script, spike removal.

### Phase 5

- `code-build` — **Steps 21–23**: tests, VQA, CI.

---

## Dependencies & Tools

| Tool                                | Use                  |
| ----------------------------------- | -------------------- |
| `npm run spike:oauth-relay`         | Local dev            |
| `.env.local` GITHUB_OAUTH_CLIENT_ID | Relay reads it       |
| WO-006 parseTextToDocument          | Read path            |
| Figma desktop + browser             | VQA                  |
| Vitest                              | Mock relay + storage |

**Production blocker:** deployed HTTPS relay URL before non-dev users connect.

---

## Open Questions

| #       | Question                   | Resolution                                                     |
| ------- | -------------------------- | -------------------------------------------------------------- |
| OQ-16-1 | Production relay URL       | **Open** — use env at build; placeholder in manifest until ops |
| OQ-16-2 | Bootstrap Pull from GitHub | **Defer**                                                      |
| OQ-16-3 | PR module split            | **RESOLVED:** `createPullRequestFlow.ts` here; Sink in WO-018  |

---

## Notes

### Spike → durable mapping

| Spike file                 | Durable destination   |
| -------------------------- | --------------------- |
| `relayClient.ts`           | keep + extend proxy   |
| `githubOAuthSpike.ts`      | `messages/github.ts`  |
| `OAuthDeviceFlowSpike.tsx` | `Settings.tsx` + hook |
| `deviceFlow.ts`            | relay/CLI only        |

### Wrong vs correct

| Wrong                                                       | Correct                         |
| ----------------------------------------------------------- | ------------------------------- |
| `fetch('https://github.com/login/device/code')` from plugin | relay `POST /oauth/device/code` |
| Store token in UI localStorage                              | `figma.clientStorage` on main   |
| `console.debug` in main                                     | `pluginLog` with redaction      |

### References

- [`github-oauth-plugin-flow.md`](./research/github-oauth-plugin-flow.md)
- [`spike-github-oauth-results.md`](./research/spike-github-oauth-results.md)
