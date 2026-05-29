import type { AuditRuleResult, ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { reassertHug } from '@/core/canvas/helpers/autoLayout';
import { pluginLog } from '@/core/pluginLog';
import {
  docPipelineSectionNames,
  docHeaderSectionName,
  docMatrixGroupName,
  docPropertiesTableGroupName,
  docUsageSectionName,
  specNameToDocKey,
} from '@/core/components/scaffold/componentPageRouting';
import {
  ensureComponentScaffoldTarget,
  ensureDocOnPage,
} from '@/core/components/scaffold/ensureComponentScaffoldTarget';
import type { ComponentScaffoldTarget } from '@/core/components/scaffold/ensureComponentScaffoldTarget';
import type { UsageFrameContext } from '@/core/components/scaffold/types';
import {
  ensureComponentSetGroup,
  findUsageSection,
  reassertDocSectionStretch,
} from '@/core/components/scaffold/usageFrame';
import { buildUsageFrameAuditRows } from '@/core/components/scaffold/usageFrameAudit';

import { buildSectionHeader } from './header';
import { buildMatrix } from './matrix';
import { buildPropertiesTable } from './propertiesTable';
import { extendComponentSetGroup } from './setGroup';
import { buildUsageNotes } from './usage';

export interface DocPipelineSections {
  header: FrameNode;
  properties: FrameNode;
  setGroup: FrameNode;
  matrix: FrameNode;
  usage: FrameNode;
}

export interface DocPipelineResult {
  ok: boolean;
  auditRows: AuditRuleResult[];
  sections: DocPipelineSections;
}

function resolveScaffoldTarget(specName: string, ctx: UsageFrameContext): ComponentScaffoldTarget {
  if (ctx.scaffoldTarget !== undefined) {
    return ctx.scaffoldTarget;
  }
  if (ctx.docRoot !== undefined && ctx.targetPage !== undefined) {
    return {
      page: ctx.targetPage,
      pageName: ctx.targetPage.name,
      content: ctx.docRoot.parent as FrameNode,
      docRoot: ctx.docRoot,
      docKey: specNameToDocKey(specName),
    };
  }
  if (ctx.targetPage !== undefined) {
    return ensureDocOnPage(ctx.targetPage, specName);
  }
  return ensureComponentScaffoldTarget(specName);
}

function removeExistingDocSections(docRoot: FrameNode, docKey: string): void {
  const removable = new Set([
    docHeaderSectionName(docKey),
    docPropertiesTableGroupName(docKey),
    docMatrixGroupName(docKey),
    docUsageSectionName(docKey),
  ]);
  for (let i = docRoot.children.length - 1; i >= 0; i--) {
    const child = docRoot.children[i];
    if (removable.has(child.name)) {
      child.remove();
    }
  }
}

function buildSectionCountAuditRow(docRoot: FrameNode, expectedNames: string[]): AuditRuleResult {
  const actualNames: string[] = [];
  for (let i = 0; i < docRoot.children.length; i++) {
    actualNames.push(docRoot.children[i].name);
  }
  const pass =
    docRoot.children.length === 5 &&
    expectedNames.every(function (name, index) {
      return actualNames[index] === name;
    });
  return {
    ruleId: 'doc-pipeline/section-count',
    pass: pass,
    diagnostic: pass
      ? 'doc pipeline emitted 5 sections in canonical order'
      : 'expected 5 sections [' +
        expectedNames.join(', ') +
        '], found ' +
        String(docRoot.children.length) +
        ' [' +
        actualNames.join(', ') +
        ']',
    severity: 'error',
  };
}

function hasDoDontCards(usageSection: FrameNode): boolean {
  if (usageSection.layoutMode !== 'HORIZONTAL') {
    return false;
  }
  let doCard = false;
  let dontCard = false;
  for (let i = 0; i < usageSection.children.length; i++) {
    const child = usageSection.children[i];
    if (child.type !== 'FRAME') {
      continue;
    }
    if (child.name === 'usage/do') {
      doCard = true;
    }
    if (child.name === 'usage/dont') {
      dontCard = true;
    }
  }
  return doCard && dontCard;
}

/**
 * WO-057 — full DesignOps doc pipeline (5 sections in canonical order).
 */
export async function buildDocPipeline(
  componentSet: ComponentSetNode,
  spec: ComponentSpecV1,
  ctx: UsageFrameContext,
): Promise<DocPipelineResult> {
  const target = resolveScaffoldTarget(spec.name, ctx);
  const docKey = target.docKey;
  const docRoot = target.docRoot;
  const expectedSectionNames = docPipelineSectionNames(docKey);

  removeExistingDocSections(docRoot, docKey);

  const existingUsage = findUsageSection(docRoot, docKey);
  if (existingUsage !== null) {
    existingUsage.remove();
  }

  pluginLog('[doc-pipeline] build start', {
    spec: spec.name,
    page: target.pageName,
  });

  const header = await buildSectionHeader(docRoot, spec);
  const properties = await buildPropertiesTable(docRoot, spec);
  const setGroup = ensureComponentSetGroup(docRoot, componentSet, docKey);
  await extendComponentSetGroup(setGroup, componentSet, spec);

  const variantByKey = ctx.variantByKey !== undefined ? ctx.variantByKey : {};
  const matrix = await buildMatrix(docRoot, spec, componentSet, variantByKey);
  const usage = await buildUsageNotes(docRoot, spec);

  reassertDocSectionStretch(header);
  reassertDocSectionStretch(properties);
  reassertDocSectionStretch(setGroup);
  reassertDocSectionStretch(matrix);
  reassertDocSectionStretch(usage);
  reassertHug(docRoot);

  const sectionCountRow = buildSectionCountAuditRow(docRoot, expectedSectionNames);
  const usageAuditRows = buildUsageFrameAuditRows({
    instances: [],
    combos: [],
    crossProductCount: 0,
    maxInstances: 0,
    cells: [],
    setPropertiesErrors: [],
    setGroup: setGroup,
    usageSection: usage,
  });
  const auditRows = usageAuditRows.concat([sectionCountRow]);

  const pluginDataKey =
    ctx.scaffoldId !== undefined
      ? 'fighub:docPipeline:v1:' + ctx.scaffoldId
      : 'fighub:docPipeline:v1:' + spec.name;
  usage.setPluginData('fighub.usageFrame', pluginDataKey);

  pluginLog('[doc-pipeline] build done', {
    sections: docRoot.children.length,
    page: target.pageName,
  });

  const docSectionPass = auditRows.some(
    (row) => row.ruleId === 'comp/doc-section-width' && row.pass,
  );
  const ok = sectionCountRow.pass && hasDoDontCards(usage) && docSectionPass;

  return {
    ok: ok,
    auditRows: auditRows,
    sections: {
      header: header,
      properties: properties,
      setGroup: setGroup,
      matrix: matrix,
      usage: usage,
    },
  };
}
