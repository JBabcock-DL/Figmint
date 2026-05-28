# GitHub PR output sink — REST flow, Sink contract, and error handling

> **Status:** ✅ Research complete — Git Data API multi-file commit flow locked; Sink interface aligned with WO-017; Org-build gate via `flags.githubOAuth`.
> **Date:** 2026-05-27
> **Owner:** WO-018 (Sprint 4)
> **PRD anchors:** §6.8 FR-IO-2, §6.9 FR-CONF-4/5, §10.2 (GitHub PR sink), §10.3 (dual-format siblings), §10.4 (export sheet path field), §11.3 (OAuth security), §13.1 (Org-only OAuth)
> **Dependencies:** WO-016 (OAuth token + GitHub API client), WO-017 (`Sink` interface + non-GitHub sinks), WO-019 (`.v1.json` + `.v1.md` serializer output)

---

## Summary

WO-018 implements `src/io/sinks/githubPR.ts` as the fifth output sink. The happy path is a **six-step GitHub REST sequence** on the Org build only:

1. Resolve OAuth token + connected repo (WO-016).
2. Read base branch tip SHA.
3. Create head branch `figmint/{contractKind}-{date}` (suffix on collision).
4. Create one **atomic multi-file commit** via the **Git Data API** (blobs → tree → commit → update ref) — required for `.v1.json` + `.v1.md` siblings per PRD §10.3.
5. Open PR (`POST /repos/{owner}/{repo}/pulls`).
6. Return PR URL to the export sheet (WO-020).

**Contents API is rejected for the primary path** — it handles one file per request and cannot atomically commit sibling files. Use Contents API only as an optional fallback for single-file smoke tests in WO-016.

**WO-016 research:** No `research/` artifact exists yet (plan still stub). This doc treats WO-016 as delivering **`src/io/github/`** (OAuth iframe bridge, token storage in `figma.clientStorage` keyed by repo URL per FR-CONF-4, authenticated `fetch` wrapper). WO-018 consumes that client; it does not re-implement OAuth.

**Overlap note:** WO-016 ticket also lists `src/io/sinks/githubPR.ts`. Reconcile in `/plan`: WO-016 AC proves **one file → one PR** via the shared GitHub client; WO-018 owns the **Sink implementation** (multi-file, branch pattern, PR body footer, error taxonomy). Avoid two competing implementations — WO-016 may land a thin internal helper; WO-018 wraps it in the Sink interface.

---

## Key findings

### 1. GitHub REST sequence (create branch → commit → PR)

All calls target `https://api.github.com` (already in `manifest.org.json` `networkAccess.allowedDomains`). Required headers:

```http
Authorization: Bearer {oauth_token}
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

| Step | Method | Endpoint | Purpose |
| :--- | :----- | :------- | :------ |
| 0 | `GET` | `/repos/{owner}/{repo}` | Validate token + repo access; read `default_branch` if base not configured |
| 1 | `GET` | `/repos/{owner}/{repo}/git/ref/heads/{baseBranch}` | Base commit SHA (`object.sha`) |
| 2 | `POST` | `/repos/{owner}/{repo}/git/refs` | Create head branch: `{ "ref": "refs/heads/figmint/drift-report-2026-05-27", "sha": "<baseSha>" }` |
| 3a | `POST` | `/repos/{owner}/{repo}/git/blobs` | One blob per file (`encoding: "utf-8"`, `content: "<string>"`) |
| 3b | `POST` | `/repos/{owner}/{repo}/git/trees` | `{ "base_tree": "<baseCommitTreeSha>", "tree": [{ "path", "mode": "100644", "type": "blob", "sha" }] }` |
| 3c | `POST` | `/repos/{owner}/{repo}/git/commits` | `{ "message", "tree": "<treeSha>", "parents": ["<baseSha>"] }` |
| 3d | `PATCH` | `/repos/{owner}/{repo}/git/refs/heads/{headBranch}` | Point head branch at new commit SHA |
| 4 | `POST` | `/repos/{owner}/{repo}/pulls` | `{ "title", "head": "<headBranch>", "base": "<baseBranch>", "body": "<markdown>" }` |

**Empty repo edge case:** Git Database endpoints return **409 Conflict** when the repository has no commits yet. Mitigation: initialize with a single Contents API `PUT` (out of MVP scope — document in Settings copy: "connect a repo with at least one commit").

**Parent commit tree for `base_tree`:** Use the **commit object's tree SHA** from step 1 (`GET .../commits/{baseSha}` → `tree.sha`), not the branch ref's object SHA directly when adding nested paths under existing directories.

### 2. Contents API vs Git Data API

| Approach | Multi-file atomic commit | Complexity | WO-018 verdict |
| :------- | :----------------------- | :--------- | :------------- |
| **Git Data API** (blobs/trees/commits/refs) | ✅ Single commit for N files | Medium | **Primary path** |
| **Contents API** (`PUT /contents/{path}`) | ❌ One commit per file | Low | WO-016 smoke test only |

Contents API **409** occurs when updating an existing path without the current file `sha`. WO-018 is create-only on a fresh head branch, so 409 is rare unless a partial failure retries the same branch — handle by surfacing conflict + optional branch suffix retry.

### 3. Branch naming: `figmint/{contractKind}-{date}`

Default pattern (configurable via Settings / export sheet):

```
figmint/{contractKind}-{yyyy-MM-dd}
```

Examples:

| `ContractKind` | Branch |
| :------------- | :----- |
| `drift-report` | `figmint/drift-report-2026-05-27` |
| `handoff-context` | `figmint/handoff-context-2026-05-27` |
| `tokens-dtcg` | `figmint/tokens-dtcg-2026-05-27` |

Rules:

- `contractKind` is the wire kind string (same as `LoadedDocument.kind` / `doc.kind`).
- Date is **UTC** `YYYY-MM-DD` at export time (deterministic for a given run).
- Pattern stored in connected-repo settings; default above. Template tokens: `{contractKind}`, `{date}`.
- **Collision:** `POST /git/refs` with an existing branch returns **422** (`Reference already exists`). Retry with suffix `-2`, `-3`, … up to 5 attempts, then fail with `branch-exists` + designer hint.
- Ticket out-of-scope stands: **never update an existing PR** — always new branch + new PR.

### 4. Multi-file commit (`.json` + `.md` siblings)

PRD §10.3 requires every contract as **both** `.v1.json` and `.v1.md` from one canonical object (WO-019). The GitHub PR sink receives **pre-serialized siblings** from the export orchestrator — it does not run the markdown serializer itself.

**Path convention** (align with FR-CONF-5 + export sheet §10.4):

- Base directory from connected-repo settings (default example: `docs/figmint/`).
- Filenames from export sheet path field; recommended stem: `{kind-slug}-{date}.v1.json` and matching `.v1.md`.
- Example pair committed in one tree:

```
docs/figmint/drift-report-2026-05-27.v1.json
docs/figmint/drift-report-2026-05-27.v1.md
```

WO-019 + WO-020 own the exact filename derivation; WO-018 accepts `files: { path, content }[]` verbatim.

### 5. PR title, body, footer + Figma file URL

**Title:** Designer commit message (first line) or auto: `figmint: {contractKind} export ({date})`.

**Body template** (markdown):

```markdown
{commitMessage}

## Files

| Path | Format |
| ---- | ------ |
| `docs/figmint/drift-report-2026-05-27.v1.json` | JSON (machine) |
| `docs/figmint/drift-report-2026-05-27.v1.md` | Markdown (human) |

---

_Generated by Figmint v{pluginVersion}_

**Source Figma file:** [{figmaFileName}]({figmaFileUrl})

**Contract kind:** `{contractKind}`
```

- `pluginVersion` — injected at build time from `package.json` (same mechanism as WO-021 dual-manifest builds).
- `figmaFileUrl` — `https://www.figma.com/design/${figma.fileKey}/${encodeURIComponent(figma.fileName)}` (plugin API: `figma.fileKey`, `figma.root.name` or persisted file name).
- Footer satisfies ticket AC: plugin version + link back to source Figma file.

### 6. Error handling

Map GitHub / network failures to **`SinkFailure`** codes for the export sheet (WO-020 reports per-sink success/failure).

| Condition | HTTP / signal | `SinkErrorCode` | Designer message (example) | Recovery hint |
| :-------- | :------------ | :-------------- | :------------------------- | :------------ |
| No token / not connected | — | `auth-required` | GitHub is not connected for this repo. | Open Settings → Connect GitHub. |
| Token expired / revoked | **401** | `auth-expired` | GitHub authorization expired. | Reconnect GitHub in Settings. |
| Insufficient scope | **403** | `forbidden` | GitHub token cannot write to this repository. | Re-authorize with repo scope. |
| Repo or base branch missing | **404** | `not-found` | Repository or base branch not found. | Check connected repo URL and base branch. |
| Branch already exists (exhausted suffix retries) | **422** | `branch-exists` | A branch named `{branch}` already exists. | Change branch pattern or delete the remote branch. |
| File SHA mismatch (Contents fallback / partial retry) | **409** | `conflict` | GitHub rejected the commit (content changed on the branch). | Retry export; plugin will use a new branch name. |
| Empty repo / git DB unavailable | **409** | `conflict` | This repository has no commits yet; cannot open a PR. | Push an initial commit to the repo first. |
| Rate limit | **403** + `X-RateLimit-Remaining: 0` | `network` | GitHub rate limit reached. Try again in a few minutes. | Wait and retry. |
| Server error | **5xx** | `network` | GitHub is temporarily unavailable. | Retry once (single backoff); then fail. |
| Offline / DNS / CORS | `TypeError`, `Failed to fetch` | `network` | Network error reaching GitHub. | Check connection and try again. |
| Community build | — | `unavailable` | GitHub PR export requires the Org build. | Use download or clipboard instead. |

**401 handling (WO-016 integration):** On `auth-expired`, call WO-016 helper to **clear** `clientStorage` token for that repo URL and emit a UI event so Settings shows "Reconnect". Never log the token.

**409 vs 422:** GitHub uses **422** for duplicate refs and **409** for git-database state conflicts (empty repo, concurrent ref update). Surface both with actionable copy; do not swallow as generic errors.

**Retries:** At most **one** retry for **5xx** and transient **network** on idempotent reads (`GET` ref). Do **not** auto-retry PR creation (non-idempotent) — designer re-clicks Export.

**Logging:** `console.debug` at each step boundary (`github-pr:ref-created`, `github-pr:commit`, `github-pr:pr-opened`) per ticket telemetry note; no token or file content in logs.

### 7. Sink interface (WO-017 contract)

WO-017 has not landed code yet; WO-018 should implement against this **locked shape** (WO-017 `/plan` should adopt verbatim from `src/io/sinks/types.ts`):

```ts
export type SinkId =
  | 'download'
  | 'clipboard'
  | 'output-page'
  | 'plugin-data'
  | 'github-pr';

export interface SinkFile {
  path: string;
  content: string;
  mimeType?: 'application/json' | 'text/markdown';
}

export interface SinkInput {
  files: SinkFile[];
  contractKind: ContractKind;
  figma: {
    fileKey: string;
    fileName: string;
    fileUrl: string;
  };
}

export type SinkErrorCode =
  | 'unavailable'
  | 'auth-required'
  | 'auth-expired'
  | 'branch-exists'
  | 'conflict'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'network'
  | 'unknown';

export interface SinkSuccess {
  ok: true;
  sinkId: SinkId;
  message: string;
  detailUrl?: string;
}

export interface SinkFailure {
  ok: false;
  sinkId: SinkId;
  code: SinkErrorCode;
  message: string;
  hint?: string;
  httpStatus?: number;
}

export type SinkResult = SinkSuccess | SinkFailure;

export interface Sink {
  readonly id: SinkId;
  readonly label: string;
  isEnabled(): boolean;
  execute(input: SinkInput, options?: GithubPRSinkOptions): Promise<SinkResult>;
}

export interface GithubPRSinkOptions {
  owner: string;
  repo: string;
  baseBranch: string;
  commitMessage: string;
  headBranch?: string;
  branchPattern?: string;
  prTitle?: string;
}
```

**`githubPR` sink specifics:**

- `id`: `'github-pr'`, `label`: `'Open GitHub PR'`.
- `isEnabled()`: `flags.githubOAuth === true` (Org build).
- `execute()`: rejects immediately with `{ ok: false, code: 'unavailable' }` when `!flags.githubOAuth` (defense in depth — Community bundle should not register the sink in WO-020, but the module must not throw).
- Options (`owner`, `repo`, `baseBranch`, paths) come from **connected repo settings** (FR-CONF-1/5) populated by WO-016 Settings UI — not hard-coded in the sink.

**Export orchestration (WO-020):** Builds `SinkInput.files` from WO-019, invokes sinks in parallel, aggregates `SinkResult[]`.

### 8. Org build only (feature flags)

Per PRD §13.1–§13.2 and existing `src/config/flags.*.ts`:

| Build | `flags.githubOAuth` | GitHub PR sink |
| :---- | :------------------ | :------------- |
| Community (`flags.community.ts`) | `false` | Hidden + `isEnabled() === false` |
| Org (`flags.org.ts`) | `true` | Available when token present |

Gating layers (all required):

1. **Build-time:** `flags.githubOAuth` from `flags.org.ts` vs `flags.community.ts`.
2. **Registry (WO-020):** Do not list GitHub PR checkbox when `!flags.githubOAuth`.
3. **Runtime:** `githubPR.isEnabled()` checks flag + connected repo + valid token probe.

No conditional imports per build — same code paths, gated visibility (PRD §13.2). Community bundle may tree-shake unused GitHub modules if the sink registry never references them; optional optimization in WO-021, not required for WO-018.

### 9. Module layout

```
src/io/github/
  auth.ts          # WO-016: OAuth token read/write clientStorage
  client.ts        # WO-016: authenticated fetch, error parsing
  types.ts         # RepoConnection, TokenRecord

src/io/sinks/
  types.ts         # WO-017: Sink, SinkInput, SinkResult
  githubPR.ts      # WO-018: Sink impl + git data commit helper
  github/
    createPullRequestFlow.ts   # pure orchestration (testable)
    branchName.ts              # pattern + collision suffix
    prBody.ts                  # footer template
```

Network calls run on the **plugin main thread** (WO-016 decision: token passed from UI iframe to main for API calls) using `fetch` against allowed domains.

---

## Recommendations for `/plan`

1. **Lock Git Data API** as the only multi-file commit path; document Contents API as WO-016 smoke-test-only.
2. **Reconcile WO-016 / WO-018 ownership** of `githubPR.ts` — single Sink module in WO-018; WO-016 exports `GitHubClient` + token helpers only.
3. **Adopt the Sink types above in WO-017** before WO-018 build so `githubPR.ts` is not orphaned.
4. **Branch collision:** implement suffix retry (`-2`, `-3`) before failing.
5. **Vitest:** unit-test `branchName.ts`, `prBody.ts`, and `createPullRequestFlow.ts` with mocked `fetch` (record ordered calls for blobs → tree → commit → ref → pulls).
6. **Integration test:** fixture repo (or `@octokit/fixtures` pattern) against a test org repo — gated behind env var `FIGMINT_GITHUB_TEST_TOKEN` in CI skip by default.
7. **Acceptance fixture:** drift-report.v1 JSON + MD siblings → one PR with both paths and footer containing Figma URL + version string.

---

## Open questions

| # | Question | Recommendation |
| :- | :------- | :------------- |
| 1 | WO-016 research complete — see [github-oauth-plugin-flow.md](../WO-016-github-oauth-integration-read-and-write-pr/research/github-oauth-plugin-flow.md) | WO-018 integration test after SPK-016-1 |
| 2 | Exact default output path prefix (`docs/figmint/` vs repo-specific) | Defer to FR-CONF-5 Settings defaults; export sheet path field overrides per run |
| 3 | PR labels / reviewers / draft PR | Out of scope per ticket — add in v1.x if needed |
| 4 | Commit author name/email | Use OAuth user's GitHub noreply email from `/user` API or static `Figmint Plugin <noreply@detroitlabs.com>` — lock in `/plan` |

None blocking WO-018 `/plan` after WO-016 OAuth spikes pass.

---

## Validated evidence

### Repo inventory (grep-verified 2026-05-27)

| Path | Status | Role |
| ---- | ------ | ---- |
| `manifest.org.json` L8–10 | ✅ | GitHub API domains whitelisted |
| `src/config/flags.*.ts` | ✅ | `githubOAuth` — PR sink also needs `githubPRSink` (WO-021) |
| `src/io/sinks/` | ❌ greenfield | `githubPR.ts` owned here |
| `src/io/github/` | ❌ greenfield | WO-016 delivers client + token |
| `packages/contracts/src/driftReport.v1.ts` | ✅ | `meta.figmaFileKey`, `meta.repoUrl` for PR body |

### Git Data API — example multi-file tree (validated contract)

After base commit SHA `abc123` and tree SHA `def456` from `GET /repos/{o}/{r}/git/commits/{abc123}`:

**Create blobs** (×2 for `.v1.json` + `.v1.md`):

```http
POST /repos/{owner}/{repo}/git/blobs
{"content":"<utf-8 string>","encoding":"utf-8"}
→ {"sha":"blobSha1"}
```

**Create tree:**

```http
POST /repos/{owner}/{repo}/git/trees
{
  "base_tree": "def456",
  "tree": [
    {"path":"docs/figmint/drift-report-2026-05-27.v1.json","mode":"100644","type":"blob","sha":"blobSha1"},
    {"path":"docs/figmint/drift-report-2026-05-27.v1.md","mode":"100644","type":"blob","sha":"blobSha2"}
  ]
}
```

**Create commit + update ref + open PR** — see §1 table in this doc.

**Empty repo:** Git Database API returns **409** — document in Settings copy; not MVP auto-init.

### Contents API rejection rationale (validated)

| API | Multi-file atomic | WO-018 |
| --- | ----------------- | ------ |
| Git Data (blobs/trees/commits) | ✅ single commit | Primary |
| Contents `PUT` per path | ❌ one commit per file | WO-016 smoke only |

---

## Decision log

| ID | Decision | Rationale | Alternatives rejected |
| -- | -------- | --------- | --------------------- |
| D-018-1 | Git Data API primary path | PRD §10.3 sibling files in one PR | Contents API multi-PUT |
| D-018-2 | Branch `figmint/{contractKind}-{date}` + suffix retry | Ticket + deterministic naming | Reuse branch / update PR |
| D-018-3 | Pre-serialized files from orchestrator | WO-019 owns format; sink is transport | Serialize inside sink |
| D-018-4 | `githubPR.ts` in WO-018 | Single Sink module | Duplicate in WO-016 |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-018-1 | Vitest mock: ordered fetch calls blobs→tree→commit→ref→pulls | Single test asserts call sequence + PR URL parse | ☐ pending (unit) |
| SPK-018-2 | Live test repo + token (env `FIGMINT_GITHUB_TEST_TOKEN`) | PR with json+md siblings; footer has Figma URL | ☐ pending (after SPK-016-1) |
| SPK-018-3 | Branch collision: create same branch twice | Suffix `-2` branch succeeds | ☐ pending |

---

## Risk register

| Risk | Sev | Likelihood | Mitigation |
| ---- | --- | ---------- | ---------- |
| Partial failure after branch create | Med | Med | Orphan branch acceptable; user message + retry |
| Large file blob API limits | Med | Low | Monitor size; split out of MVP |
| Token lacks `repo` scope | High | Low | Map 401 → reconnect UX |
| WO-017 Sink type drift | Med | Med | Shared `types.ts` in WO-017 first |

---

## Sources

### Internal

- Sprint index: [sprint-4-io-gating-research-index.md](../../research/sprint-4-io-gating-research-index.md)
- Quality bar: [research-quality-bar.md](../../../templates/research-quality-bar.md)
- WO-016 research: [github-oauth-plugin-flow.md](../WO-016-github-oauth-integration-read-and-write-pr/research/github-oauth-plugin-flow.md)
- `.github/Sprint 4/WO-016-github-oauth-integration-read-and-write-pr/ticket.md` — OAuth, token storage, scope `repo`
- `.github/Sprint 4/WO-017-output-sinks-download-clipboard-output-page-plugindata/ticket.md` — shared `Sink` interface
- `.github/Sprint 4/WO-020-unified-export-sheet-ui/ticket.md` — parallel sink invocation, Org-only GitHub checkbox
- `src/config/flags.org.ts` / `flags.community.ts` — `githubOAuth` gate
- `manifest.org.json` — `api.github.com` + `github.com` allowed domains
- `packages/contracts/src/driftReport.v1.ts` — `meta.figmaFileKey`, `meta.repoUrl`

### GitHub REST API

- [Git database — Create a reference](https://docs.github.com/en/rest/git/refs#create-a-reference)
- [Git database — Create a blob / tree / commit](https://docs.github.com/en/rest/git/blobs) / [trees](https://docs.github.com/en/rest/git/trees) / [commits](https://docs.github.com/en/rest/git/commits)
- [Pulls — Create a pull request](https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request)
- [Contents — Create or update file contents](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents) (single-file; 409 on sha mismatch)
- [Using the REST API to interact with your Git database](https://docs.github.com/en/rest/guides/using-the-rest-api-to-interact-with-your-git-database) — empty repo 409 note
