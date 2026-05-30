import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { inferArchetype } from '@/core/components/scaffold/specAdapter';
import { scanDependencies } from '@/core/import/shared/dependencyScanner';
import { pluginLog } from '@/core/pluginLog';
import type { ImportParseIssue, ImportTemplateContext, ImportTemplateResult } from '@/core/import/types';

import { attachConfidence } from './attachConfidence';
import { buildSubComponents } from './buildSubComponents';
import { collectClassTokensFromComponent } from './collectClassTokens';
import { createTsxSourceFile } from './createSource';
import { extractBindings } from './extractBindings';
import { findExportedComponent } from './findExportedComponent';
import { mergeFigmaMappingIntoSpec, parseFigmaMappingText } from './mergeFigmaMapping';
import { findCvaVariantMap } from './parseCvaVariants';
import { inferLayoutFromRootJsx } from './parseJsxLayout';
import { parsePropsFromComponent } from './parseProps';
import { mapTsTypeToSpecProp } from './propTypeMapper';

function ensureCvaProps(
  props: import('@detroitlabs/fighub-contracts').ComponentSpecProp[],
  cvaMap: ReturnType<typeof findCvaVariantMap>,
): import('@detroitlabs/fighub-contracts').ComponentSpecProp[] {
  if (cvaMap === null) {
    return props;
  }
  const result = props.slice();
  const axisNames = Object.keys(cvaMap.axes);
  for (let i = 0; i < axisNames.length; i++) {
    const axis = axisNames[i];
    const exists = result.some(function (p) {
      return p.name === axis;
    });
    if (!exists) {
      const mapped = mapTsTypeToSpecProp(axis, undefined, undefined, cvaMap.axes);
      if (mapped !== null) {
        result.push(mapped);
      }
    }
  }
  return result;
}

export function parseReactComponent(ctx: ImportTemplateContext): ImportTemplateResult {
  const issues: ImportParseIssue[] = [];
  pluginLog('[import:react:pass]', { pass: 'createTsxSourceFile' });
  const sourceFile = createTsxSourceFile(ctx.sourcePath, ctx.sourceText);

  pluginLog('[import:react:pass]', { pass: 'findExportedComponent' });
  const match = findExportedComponent(sourceFile);
  if (match === null) {
    issues.push({
      code: 'no-exported-component',
      message: 'No exported React component found in source',
      severity: 'error',
    });
    return {
      spec: {
        v: 1,
        kind: 'component-spec',
        name: 'Unknown',
        framework: 'react',
        variantMatrix: {},
        props: [],
        bindings: [],
        layout: { direction: 'horizontal', gap: '8', sizing: { horizontal: 'hug', vertical: 'hug' } },
        confidence: { layout: 'low', bindings: 'low' },
      },
      dependencyTree: { rootImportPath: ctx.sourcePath, nodes: [] },
      issues: issues,
    };
  }

  pluginLog('[import:react:pass]', { pass: 'findCvaVariantMap' });
  const cvaMap = findCvaVariantMap(sourceFile);

  pluginLog('[import:react:pass]', { pass: 'parsePropsFromComponent' });
  const parsed = parsePropsFromComponent(match, sourceFile, cvaMap);
  parsed.props = ensureCvaProps(parsed.props, cvaMap);

  if (ctx.figmaMappingText !== undefined && ctx.figmaMappingText.length > 0) {
    pluginLog('[import:react:pass]', { pass: 'mergeFigmaMapping' });
    const mapping = parseFigmaMappingText(ctx.figmaMappingText);
    const merged = mergeFigmaMappingIntoSpec(parsed.props, parsed.variantMatrix, mapping);
    parsed.props = merged.props;
    parsed.variantMatrix = merged.variantMatrix;
  }

  pluginLog('[import:react:pass]', { pass: 'scanDependencies' });
  const dependencyTree = scanDependencies(ctx.sourceText, ctx.sourcePath, {
    registryKeys: ctx.registryKeys,
  });

  pluginLog('[import:react:pass]', { pass: 'collectClassTokensFromComponent' });
  const classTokens = collectClassTokensFromComponent(match, sourceFile, cvaMap);

  pluginLog('[import:react:pass]', { pass: 'extractBindings', tokenCount: classTokens.length });
  const bindingResult = extractBindings(classTokens, ctx.tokenResolver, {
    includeIconSlotBindings: parsed.iconSlots?.leading === true,
  });
  for (let i = 0; i < bindingResult.unresolvedTokens.length; i++) {
    issues.push({
      code: 'unresolved-token',
      message: 'Could not resolve token: ' + bindingResult.unresolvedTokens[i],
      severity: 'warning',
    });
  }

  pluginLog('[import:react:pass]', { pass: 'inferLayoutFromRootJsx' });
  const layoutResult = inferLayoutFromRootJsx(match, sourceFile, classTokens);

  pluginLog('[import:react:pass]', { pass: 'buildSubComponents' });
  const subComponents = buildSubComponents(dependencyTree, ctx.registryKeys);

  const partialSpec: ComponentSpecV1 = {
    v: 1,
    kind: 'component-spec',
    name: match.name,
    framework: 'react',
    variantMatrix: parsed.variantMatrix,
    props: parsed.props,
    bindings: bindingResult.bindings,
    layout: layoutResult.layout,
  };

  if (parsed.componentProps !== undefined) {
    partialSpec.componentProps = parsed.componentProps;
  }
  if (parsed.iconSlots !== undefined) {
    partialSpec.iconSlots = parsed.iconSlots;
  }
  if (subComponents.length > 0) {
    partialSpec.subComponents = subComponents;
  }

  pluginLog('[import:react:pass]', { pass: 'inferArchetype' });
  partialSpec.archetype = inferArchetype(partialSpec);

  pluginLog('[import:react:pass]', { pass: 'attachConfidence' });
  partialSpec.confidence = attachConfidence(bindingResult.unresolvedTokens, layoutResult.confidence);

  return {
    spec: partialSpec,
    dependencyTree: dependencyTree,
    issues: issues,
  };
}
