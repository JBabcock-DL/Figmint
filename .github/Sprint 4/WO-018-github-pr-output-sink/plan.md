# Plan — WO-018: GitHub PR output sink

## Approach

Add **`github-pr`** as the fifth sink implementing WO-017 **`Sink`**. Commits **pre-serialized** `{ path, content }[]` (from WO-020 + WO-019) via **Git Data API** in one atomic commit. All HTTP through WO-016 **relay proxy** — never direct `api.github.com` from plugin.

WO-016 delivers **`createPullRequestFlow.ts`**, **`branchName.ts`**, **`prBody.ts`**, **`githubErrors.ts`**. WO-018 adds **`src/io/sinks/githubPR.ts`**, export message wiring, and Sink-specific options.

**Never** update existing PRs — always new branch + new PR.

---

## Acceptance criteria traceability

| Ticket AC | Plan steps |
| --------- | ---------- |
| Drift `.v1.json` + `.v1.md` one commit | Steps 4, 9, 11 |
| PR body with Figma URL + version footer | Steps 3, 6 |
| Error taxonomy + hints | Steps 5, 6 |
| Community unavailable / Org enabled | Step 6 `isGithubPREnabled()` |
| Vitest branch, body, REST sequence | Steps 2–5, 10 |

---

## Steps

- [x] **Step 1** — Extend `src/io/sinks/types.ts` (coordinate merge with WO-017):

```ts
export type SinkId =
  | 'download'
  | 'clipboard'
  | 'output-page'
  | 'plugin-data'
  | 'github-pr';

export type SinkFailureCode =
  | 'auth-required'
  | 'auth-expired'
  | 'branch-exists'
  | 'conflict'
  | 'forbidden'
  | 'not-found'
  | 'network'
  | 'unavailable';

export interface GithubPRSinkOptions {
  owner: string;
  repo: string;
  baseBranch: string;
  commitMessage: string;
  branchPattern?: string; // default fighub/{contractKind}-{date}
  headBranch?: string; // explicit override
  prTitle?: string;
}

export interface GithubPRSinkContext {
  files: Array<{ path: string; content: string }>;
  contractKind: string;
  repoUrl: string;
  options: GithubPRSinkOptions;
  figmaFileKey: string;
  figmaFileName: string;
}
```

  - Extend `SinkResult` optional `code?: SinkFailureCode` for export sheet display.
  - **Done when:** typecheck with WO-017 types merged.

- [x] **Step 2** — Implement `src/io/github/branchName.ts`:

```ts
export const DEFAULT_BRANCH_PATTERN = 'fighub/{contractKind}-{date}';

export function formatBranchPattern(
  pattern: string,
  contractKind: string,
  dateUtc: string,
): string;
// replace {contractKind}, {date} tokens

export function withCollisionSuffix(branch: string, attempt: number): string;
// attempt 0 → branch; 1 → branch-2; 2 → branch-3 …

export const MAX_BRANCH_ATTEMPTS = 5;
```

  - **Done when:** `tests/unit/io/github/branchName.test.ts` — date UTC, suffix `-2`.

- [x] **Step 3** — Implement `src/io/github/prBody.ts`:

```ts
export function buildPrBody(input: {
  commitMessage: string;
  files: Array<{ path: string; format: 'json' | 'md' }>;
  pluginVersion: string;
  figmaFileUrl: string;
  figmaFileName: string;
  contractKind: string;
}): string;
```

  - Template exactly per research §5 (Files table + footer + Figma link).
  - `pluginVersion` from `import.meta.env.PACKAGE_VERSION`.
  - **Done when:** snapshot test `tests/unit/io/github/prBody.test.ts`.

- [x] **Step 4** — Implement `src/io/github/githubErrors.ts`:

```ts
export interface MappedGitHubError {
  code: SinkFailureCode;
  message: string;
  hint?: string;
  clearToken?: boolean;
}

export function mapGitHubHttpError(
  status: number,
  body: unknown,
  context: { branch?: string },
): MappedGitHubError;
```

  - Implement full table from research §6 (401→auth-expired+clearToken, 422 branch, 409 empty repo, etc.).
  - **Done when:** table-driven test with one case per row.

- [x] **Step 5** — Finalize `src/io/github/createPullRequestFlow.ts` (if WO-016 landed stub, extend here):
  - Accept `GithubPRSinkContext` + token.
  - Branch creation with collision loop (422 → suffix, max 5).
  - Single 5xx retry on GET ref/commit only.
  - Return `{ prUrl, prNumber, headBranch }`.
  - **Done when:** integration test mocks 9+ relay calls in order.

- [x] **Step 6** — Implement `src/io/sinks/githubPR.ts`:

```ts
import { flags } from '@/config/flags';

export function isGithubPREnabled(): boolean {
  return flags.githubOAuth === true && flags.githubPRSink === true;
}

export async function executeGithubPRSink(
  ctx: GithubPRSinkContext,
): Promise<SinkResult>;
```

  - Load token via `getToken(ctx.repoUrl)` — if missing → `{ ok: false, code: 'auth-required', … }`.
  - Build head branch via `branchName.ts`.
  - Build PR body via `prBody.ts`.
  - Call `createPullRequestFlow`.
  - On mapped error with `clearToken` → `clearToken(repoUrl)`.
  - Success → `{ ok: true, message: 'Opened PR #N', artifacts: [{ destination: prUrl }] }`.
  - **Done when:** mocked flow test passes.

- [x] **Step 7** — Add to `src/io/messages/export.ts` (owned by WO-020, add github slice here if export.ts exists):

```ts
export interface ExportGithubPRPayload {
  repoUrl: string;
  githubPROptions: GithubPRSinkOptions;
  files: Array<{ path: string; content: string }>;
  contractKind: string;
}
```

  - Main `export/run` handler calls `executeGithubPRSink` when `'github-pr' in sinks`.

- [x] **Step 8** — Wire `src/main.ts`:
  - In `handleExportRun`, for each requested sink `github-pr`:
    - Read `figma.fileKey`, `figma.root.name` for PR body URL: `https://www.figma.com/design/${fileKey}/${encodeURIComponent(fileName)}`
    - Execute sink, emit `export/sink-result`
  - ES2017 only; `pluginLog('github-pr:opened', prNumber)` — no token/content.

- [x] **Step 9** — Register in `src/io/sinks/index.ts`:

```ts
// github-pr invoked via export/run, not direct runSink('github-pr') from UI iframe without token context
export { executeGithubPRSink, isGithubPREnabled } from './githubPR';
```

- [x] **Step 10** — Integration test `tests/unit/io/sinks/githubPR.test.ts`:
  - Input: drift-report serialized json+md paths under `docs/fighub/drift-2026-05-27.v1.{json,md}`
  - Assert: one tree POST with 2 blob entries; one pulls POST.
  - **Done when:** ticket AC "one commit" verified in mock assertions.

- [x] **Step 11** — Error copy constants `src/io/github/userMessages.ts` for empty repo / branch exists (WO-020 can import hints).

- [x] **Step 12** — CI: full test suite + build.

---

## Build Agents

### Phase 1 (after WO-016 relay + storage merged)
- `code-build` — **Steps 1–3**: types, branchName, prBody.

### Phase 2 (parallel)
- `code-build` — **Steps 4–5**: errors + createPullRequestFlow.
- `code-build` — **Step 11**: user message constants.

### Phase 3 (sequential — needs export messages from WO-020 or minimal stub)
- `code-build` — **Steps 6–9**: githubPR sink + main export handler wiring.

### Phase 4
- `code-build` — **Steps 10–12**: integration tests + CI.

---

## Dependencies & Tools

| Dependency | Required for |
| ---------- | ------------ |
| WO-016 | relay, token, createPullRequestFlow base |
| WO-017 | Sink types |
| WO-019 | file contents shape |
| WO-020 | export/run orchestration (can stub handler until WO-020) |

---

## Open Questions

| # | Question | Resolution |
| - | -------- | ---------- |
| OQ-18-1 | export.ts owner | WO-020 owns module; WO-018 adds github-pr branch in main handler |

---

## Notes

### REST call checklist (relay proxy path)

| # | Method | Path |
| - | ------ | ---- |
| 1 | GET | `/repos/{o}/{r}` |
| 2 | GET | `/repos/{o}/{r}/git/ref/heads/{base}` |
| 3 | GET | `/repos/{o}/{r}/git/commits/{sha}` |
| 4 | POST | `/repos/{o}/{r}/git/refs` |
| 5 | POST | `/repos/{o}/{r}/git/blobs` × N |
| 6 | POST | `/repos/{o}/{r}/git/trees` |
| 7 | POST | `/repos/{o}/{r}/git/commits` |
| 8 | PATCH | `/repos/{o}/{r}/git/refs/heads/{head}` |
| 9 | POST | `/repos/{o}/{r}/pulls` |

### Wrong vs correct

| Wrong | Correct |
| ----- | ------- |
| Contents API PUT per file | Git Data API single commit |
| Direct fetch api.github.com | relay proxy |
| Reuse existing PR head | new branch every time |

### References

- [`github-pr-sink-flow.md`](./research/github-pr-sink-flow.md)
