# WO-018 — plan.md (stub)

> Stub — fill before `/build` runs. Reference `ticket.md` for full scope.

## Approach

_To be filled during `/plan`._

## Tasks

1. _TBD_

## Build Agents

### Phase 1

- _TBD_

## Notes

_Research 2026-05-27 — see [github-pr-sink-flow.md](./research/github-pr-sink-flow.md)._

- **Commit API:** Git Data API (blobs → tree → commit → PATCH ref) for atomic `.json` + `.md` siblings; Contents API rejected as primary path.
- **Branch:** default `figmint/{contractKind}-{yyyy-MM-dd}`; suffix `-2`/`-3` on 422 duplicate ref.
- **Sink contract:** implement WO-017 `Sink` / `SinkResult`; options via `GithubPRSinkOptions`; gate with `flags.githubOAuth`.
- **WO-016 split:** WO-016 delivers `src/io/github/{auth,client}.ts`; WO-018 owns `src/io/sinks/githubPR.ts` + helpers — reconcile WO-016 ticket duplicate before build.
- **Errors:** 401 → `auth-expired` + clear token; 409 → `conflict`; 422 → `branch-exists`; network/5xx → `network` with single read retry only.
- **Blocker:** WO-016 OAuth `/plan` (no research artifact yet) must land client + token storage before integration tests.

## References

- Ticket: `./ticket.md`
- Research: [github-pr-sink-flow.md](./research/github-pr-sink-flow.md)
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
