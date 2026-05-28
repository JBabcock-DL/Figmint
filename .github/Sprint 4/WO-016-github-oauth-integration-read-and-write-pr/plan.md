# WO-016 — plan.md (stub)

> Stub — fill before `/build` runs. Reference `ticket.md` for full scope.

## Approach

_To be filled during `/plan`._

## Tasks

1. _TBD_

## Build Agents

### Phase 1

- _TBD_

## Notes

_Research (`research/github-oauth-plugin-flow.md`, 2026-05-27) — decisions and blockers for `/plan`._

### Locked decisions

- **OAuth grant (MVP):** GitHub Device Authorization Grant — `client_id` only, no relay server, no `client_secret` in bundle.
- **Token home:** Main thread `figma.clientStorage`; keys `figmint:github:token:<normalizedRepoUrl>` and `figmint:github:config:<normalizedRepoUrl>`.
- **GitHub API calls:** Authenticated fetch on main thread; UI acquires OAuth then sends `github/token/save` message.
- **Read path:** `loadFromGitHub` reuses `parseTextToDocument` / `detectContract`; new `GitHubSourceMeta` port type.
- **Scope:** `repo` at connect; path allowlist enforced in application code.
- **Gating:** `flags.githubOAuth` + Org manifest domains; Community manifest stays `["none"]`.
- **Deferred:** Auth Code + PKCE + public HTTPS relay (Figma-recommended pattern) → v1.x if Device Flow UX fails.

### Blockers

- **OAuth App registration:** Detroit Labs must create GitHub OAuth App with Device Flow enabled and supply `GITHUB_OAUTH_CLIENT_ID` for Org CI/local builds (OQ-16-1).
- **VQA environment:** Test repo + Org build install required for end-to-end AC.

### Open for `/plan`

- Minimal `Settings.tsx` shell vs deferring layout to WO-021 feature-gating audit.
- Exact Vitest fixture strategy for GitHub API responses.
- Whether Bootstrap tab gets “Pull from GitHub” in WO-016 or a follow-on UI ticket.

## References

- Ticket: `./ticket.md`
- Research: [GitHub OAuth plugin flow](research/github-oauth-plugin-flow.md)
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
