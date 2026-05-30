import type { ComponentFramework } from '@detroitlabs/fighub-contracts';

/** Source file extensions per framework for import/list-files (Phase 4a: parse is React-only). */
export const IMPORT_SOURCE_EXTENSIONS: Record<ComponentFramework, readonly string[]> = {
  react: ['.tsx', '.jsx'],
  vue: ['.vue'],
  wc: ['.ts', '.tsx'],
  swiftui: ['.swift'],
  compose: ['.kt', '.kts'],
};

export const IMPORT_EXCLUDED_SUFFIXES: readonly string[] = [
  '.test.tsx',
  '.test.jsx',
  '.test.ts',
  '.stories.tsx',
  '.stories.jsx',
  '.figma.tsx',
  '.figma.jsx',
  '.spec.tsx',
  '.spec.ts',
];

export function shouldIncludeImportSourcePath(path: string, framework: ComponentFramework): boolean {
  const extensions = IMPORT_SOURCE_EXTENSIONS[framework];
  let extensionMatch = false;
  for (let i = 0; i < extensions.length; i++) {
    if (path.endsWith(extensions[i])) {
      extensionMatch = true;
      break;
    }
  }
  if (!extensionMatch) {
    return false;
  }
  for (let j = 0; j < IMPORT_EXCLUDED_SUFFIXES.length; j++) {
    if (path.endsWith(IMPORT_EXCLUDED_SUFFIXES[j])) {
      return false;
    }
  }
  return true;
}

export function importSourceExtensionsLabel(framework: ComponentFramework): string {
  return IMPORT_SOURCE_EXTENSIONS[framework].join(', ');
}

export function isComponentFramework(value: unknown): value is ComponentFramework {
  return (
    value === 'react' ||
    value === 'vue' ||
    value === 'wc' ||
    value === 'swiftui' ||
    value === 'compose'
  );
}
