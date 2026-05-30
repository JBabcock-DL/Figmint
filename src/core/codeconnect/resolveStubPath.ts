import { kebabCase } from '@/core/drift/componentKeys';

function toPascalCase(name: string): string {
  const parts = name.split(/[\s_\-/]+/);
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.length === 0) {
      continue;
    }
    result = result + part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }
  if (result.length === 0) {
    return name;
  }
  return result;
}

function normalizeSpecsPath(specsPath: string): string {
  if (specsPath.length === 0) {
    return '';
  }
  let normalized = specsPath.replace(/\\/g, '/');
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, normalized.length - 1);
  }
  return normalized;
}

export function resolveStubPath(input: {
  specsPath: string;
  componentKey: string;
  componentName: string;
}): { relativePath: string; implementationImportPath: string } {
  const specsRoot = normalizeSpecsPath(input.specsPath);
  const folder = kebabCase(input.componentKey);
  const fileName = toPascalCase(input.componentName) + '.figma.tsx';
  let relativePath = folder + '/' + fileName;
  if (specsRoot.length > 0) {
    relativePath = specsRoot + '/' + relativePath;
  }
  return {
    relativePath: relativePath,
    implementationImportPath: './' + folder,
  };
}
