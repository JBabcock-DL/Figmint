#!/usr/bin/env node
import { createGenerator } from 'ts-json-schema-generator';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..');
const distDir = join(pkgRoot, 'dist');

const CONTRACTS = [
  { file: 'src/opsProgram.v1.ts', type: 'OpsProgramV1', out: 'ops-program.v1.schema.json' },
  { file: 'src/tokens.v1.ts', type: 'TokensV1', out: 'tokens.v1.schema.json' },
  {
    file: 'src/tokensInput.v1.ts',
    type: 'TokensV1WC3DTCG',
    out: 'tokens.v1.w3c-dtcg.schema.json',
  },
  {
    file: 'src/tokensInput.v1.ts',
    type: 'TokensV1Legacy',
    out: 'tokens.v1.legacy.schema.json',
  },
  {
    file: 'src/componentSpec.v1.ts',
    type: 'ComponentSpecV1',
    out: 'component-spec.v1.schema.json',
  },
  { file: 'src/driftReport.v1.ts', type: 'DriftReportV1', out: 'drift-report.v1.schema.json' },
  { file: 'src/auditReport.v1.ts', type: 'AuditReportV1', out: 'audit-report.v1.schema.json' },
  {
    file: 'src/handoffContext.v1.ts',
    type: 'HandoffContextV1',
    out: 'handoff-context.v1.schema.json',
  },
  { file: 'src/registry.v1.ts', type: 'RegistryV1', out: 'registry.v1.schema.json' },
];

await mkdir(distDir, { recursive: true });

for (const { file, type, out } of CONTRACTS) {
  const generator = createGenerator({
    path: join(pkgRoot, file),
    tsconfig: join(pkgRoot, 'tsconfig.schemas.json'),
    type,
    skipTypeCheck: false,
    additionalProperties: false,
    expose: 'export',
    jsDoc: 'extended',
    sortProps: true,
    topRef: true,
  });
  const schema = generator.createSchema(type);
  schema.$schema = 'https://json-schema.org/draft/2020-12/schema';
  schema.$id = `https://figmint.detroitlabs.com/schemas/${out}`;
  await writeFile(join(distDir, out), `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
  console.log(`✓ ${out}`);
}
