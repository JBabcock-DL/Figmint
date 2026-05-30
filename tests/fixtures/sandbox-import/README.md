# Sandbox import fixtures (Sprint 8 manual VQA)

Copy this folder into a **connected GitHub repo** (or point the plugin at the **FigHub** repo and use these paths as-is).

## Browse repo vs Import from repo

| Components tab section | Looks for | Sandbox paths |
|------------------------|-----------|---------------|
| **Browse repo components** | `*.component-spec.v1.json` (anywhere), `*/component-spec/*.v1.json`, or `*.json` under specs path — **all frameworks** in JSON | `design/components/button.component-spec.v1.json`, `alert-banner.component-spec.v1.json` (vue), `tests/fixtures/component-spec/*.v1.json` |
| **Import from repo** | Framework-specific sources (`.tsx`, `.vue`, `.swift`, …) | `components/ui/button.tsx`, … |

If Browse shows “No component-spec JSON on GitHub”, commit and push the `design/components/*.component-spec.v1.json` files below — uncommitted local files are invisible to the plugin.

## Layout

| Path | Purpose |
|------|---------|
| `design/components/button.component-spec.v1.json` | **Browse repo** — batch scaffold Button from JSON |
| `design/components/icon.component-spec.v1.json` | **Browse repo** — second catalog entry |
| `components/ui/button.tsx` | **Import from repo** — shadcn CVA Button (6×4 variants) |
| `components/ui/icon.tsx` | Registered sub-component (`icon` in registry) |
| `design/components/alert-banner.component-spec.v1.json` | **Browse repo** — Vue framework spec |
| `components/ui/badge.tsx` | **Not** in registry — triggers unknown dependency |
| `components/ui/alert.tsx` | Composed sample — Icon ✓, Button ✓, Badge ⚠ unknown |
| `app/globals.css` | Tailwind v4 `@theme` for token resolver auto-detect |
| `.fighub-registry.json` | Repo registry supplement (`button`, `icon` keys) |

## Quick setup (FigHub repo)

1. Connect plugin Settings → GitHub → `JBabcock-DL/FigHub` (or your fork).
2. Components tab → **Import from repo** → root `components/ui/` (or full path below).
3. Pick files using the table in [sprint-8-user-checklist.md](../../../.github/Sprint%208/research/sprint-8-user-checklist.md).

## Quick setup (external repo)

```bash
# From repo root — copy fixtures into your design-system repo
cp -r tests/fixtures/sandbox-import/components ./components   # merge ui/ subtree
cp -r tests/fixtures/sandbox-import/design ./design
cp tests/fixtures/sandbox-import/app/globals.css ./app/globals.css
cp tests/fixtures/sandbox-import/.fighub-registry.json ./.fighub-registry.json
git add components/ui design/components app/globals.css .fighub-registry.json
git commit -m "Add FigHub sandbox import fixtures"
git push
```

Adjust paths if your repo uses `src/components/ui/` — set **Import root** in the plugin to match.

## Expected parse outcomes

| File | Spec name | Variant matrix | Dependency tree |
|------|-----------|----------------|-----------------|
| `button.tsx` | Button | 6 × 4 (24) | `Loader2` may show unknown (external package) — OK |
| `alert.tsx` | Alert | (layout chip) | Icon ✓ registered · Badge ⚠ unknown · Button ✓ after button scaffolded |
| `icon.tsx` | Icon | — | Leaf component |
| `badge.tsx` | Badge | 2 variants | Leaf · unknown until registered |

## Token resolver

With `app/globals.css` on the default branch, Settings → Token resolver should detect **Tailwind v4 (@theme in app/globals.css)**. Override smoke test:

```json
{"bg-primary": "color/primary/default"}
```

## Code Connect

After scaffolding **Button** on canvas, Code Connect section should list it as unmapped until a mapping PR is emitted. Use **Emit PR** to generate `button.figma.tsx` stub (org gate + GitHub connected).

## Notes

- `@/lib/utils` imports are ignored by the parser (path alias only).
- `.test.tsx`, `.stories.tsx`, `.figma.tsx` files are excluded from file list.
- Do not commit secrets; plugin uses OAuth device flow via relay.
