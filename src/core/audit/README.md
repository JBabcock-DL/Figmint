# Audit reporter (WO-010)

Post-push validation for variable operations. Returns a versioned `AuditReportV1` contract document.

## WO-008 integration

After push commit:

```ts
const figmaCollections = await readFigmaVariableState();
const audit = await runAudit('variables', { canonical, pushResult, figmaCollections });
return { ...pushResult, audit };
```

Callers check `audit.passed` for validation failures. Do **not** merge audit diagnostics into `pushResult.errors[]` — push errors stay operational-only.

## Scope

Sprint 2 implements `runAudit('variables')` only. Other scopes throw `unsupported audit scope`.
