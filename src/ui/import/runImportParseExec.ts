import { getImportTemplate } from '@/core/import/registry';
import { createTokenResolver } from '@/core/import/shared/tokenResolver';
import type { ImportParseExecMessage, ImportParseExecResultMessage } from '@/io/messages/import';
import { IMPORT_PARSE_EXEC_RESULT } from '@/io/messages/import';

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && typeof (error as Error).message === 'string') {
    return (error as Error).message;
  }
  return String(error);
}

/** Runs React ImportTemplate.parse in the UI iframe (TypeScript AST lives here only). */
export function runImportParseExec(message: ImportParseExecMessage): ImportParseExecResultMessage {
  try {
    const template = getImportTemplate('react');
    if (template === null) {
      return {
        type: IMPORT_PARSE_EXEC_RESULT,
        requestId: message.requestId,
        ok: false,
        error: 'React import template is unavailable.',
      };
    }

    const tokenResolver = createTokenResolver({
      repoUrl: '',
      classToVariable: message.classToVariable,
      manualMap: message.manualMap,
      disableCache: true,
    });

    const parseResult = template.parse({
      sourcePath: message.sourcePath,
      sourceText: message.sourceText,
      figmaMappingText: message.figmaMappingText,
      tokenResolver: tokenResolver,
      registryKeys: message.registryKeys,
    });

    const issues = parseResult.issues.map(function (issue) {
      return {
        code: issue.code,
        message: issue.message,
      };
    });

    return {
      type: IMPORT_PARSE_EXEC_RESULT,
      requestId: message.requestId,
      ok: true,
      spec: parseResult.spec,
      dependencyTree: parseResult.dependencyTree,
      issues: issues,
    };
  } catch (error) {
    return {
      type: IMPORT_PARSE_EXEC_RESULT,
      requestId: message.requestId,
      ok: false,
      error: extractErrorMessage(error),
    };
  }
}
