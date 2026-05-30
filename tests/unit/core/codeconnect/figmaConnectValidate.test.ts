import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import buttonRef from '@/core/codeconnect/__fixtures__/unmapped-button-ref.json';
import { ReactMappingTemplate } from '@/core/codeconnect/templates/react';

const FIXTURE_ROOT = join(process.cwd(), 'tests/fixtures/code-connect-consumer');
const GENERATED_STUB = join(FIXTURE_ROOT, 'src/components/button/Button.figma.tsx');

const shouldValidate = process.env.FIGMA_CONNECT_VALIDATE === '1';

describe('figma connect validate', () => {
  it.skipIf(!shouldValidate)('generated stub passes npx figma connect validate', function () {
    const template = new ReactMappingTemplate();
    const stub = template.generateStub({
      component: buttonRef,
      repoComponentsRoot: 'src/components',
      implementationImportPath: './button',
      figmaFileSlug: 'Design System',
    });

    mkdirSync(join(FIXTURE_ROOT, 'src/components/button'), { recursive: true });
    writeFileSync(GENERATED_STUB, stub.content, 'utf8');

    execSync('npx figma connect validate', {
      cwd: FIXTURE_ROOT,
      stdio: 'pipe',
      encoding: 'utf8',
    });

    expect(stub.content).toContain('figma.connect(');
  });
});
