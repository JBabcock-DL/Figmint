# Archived dual-build artifacts (WO-021 backlog)

**Deferred 2026-05-27:** Product decision to ship a **single build** with all features enabled until Community vs Org distribution is needed again.

When WO-021 is picked up, restore from git history:

- `scripts/build-community.mjs`, `scripts/build-org.mjs`
- `src/config/flags.community.ts`, `src/config/flags.org.ts`
- Dual manifest copy step in build scripts

Reference manifests still at repo root:

- `manifest.community.json` — `networkAccess: ["none"]`
- `manifest.org.json` — GitHub domains only

Active build uses root `manifest.json` + `src/config/flags.ts` (all capabilities `true`).
