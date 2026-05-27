import { runAudit } from '@/core/audit/runAudit';
import { pluginLog } from '@/core/pluginLog';
import { colorToHex } from '@/core/canvas/lib/colorFormats';
import { loadFontsForCanvas } from '@/core/canvas/lib/fonts';
import { findStyleGuidePage } from '@/core/canvas/lib/pages';
import { bindPaintToVar } from '@/core/canvas/helpers/bindings';
import {
  ensureLocalVariableMap,
  resolveCanonicalPath,
  type VariablePathMap,
} from '@/core/canvas/lib/variables';
import { loadPlatformMappingRows } from '@/core/canvas/data/loadCanvasData';
import type { CanvasBuildContext, CanvasBuildResult } from '@/core/canvas/types';

const ARCH_BIND = [
  { name: 'Primitives', path: 'color/primary/default' },
  { name: 'Theme', path: 'color/secondary/default' },
  { name: 'Typography', path: 'color/neutral/800' },
  { name: 'Layout', path: 'color/neutral/800' },
  { name: 'Effects', path: 'color/neutral/800' },
];

function readCodeSyntax(variable: Variable): { WEB: string; ANDROID: string; iOS: string } {
  const extended = variable as Variable & {
    codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string; IOS?: string };
  };
  const cs = extended.codeSyntax !== undefined ? extended.codeSyntax : {};
  return {
    WEB: cs.WEB !== undefined ? String(cs.WEB) : '',
    ANDROID: cs.ANDROID !== undefined ? String(cs.ANDROID) : '',
    iOS: cs.iOS !== undefined ? String(cs.iOS) : cs.IOS !== undefined ? String(cs.IOS) : '',
  };
}

async function resolveRawValue(variableId: string, modeId: string): Promise<RGB | null> {
  let variable = await figma.variables.getVariableByIdAsync(variableId);
  if (variable === null) {
    return null;
  }
  for (let depth = 0; depth < 10; depth++) {
    const val = variable.valuesByMode[modeId];
    if (val !== null && typeof val === 'object' && 'type' in val && val.type === 'VARIABLE_ALIAS') {
      variable = await figma.variables.getVariableByIdAsync(val.id);
      if (variable === null) {
        return null;
      }
      continue;
    }
    if (val !== null && typeof val === 'object' && 'r' in val) {
      return val as RGB;
    }
    return null;
  }
  return null;
}

function isUnderPlatformMappingTable(node: BaseNode, pmTableId: string | null): boolean {
  let parent: BaseNode | null = node.parent;
  while (parent !== null && 'id' in parent) {
    if (pmTableId !== null && parent.id === pmTableId) {
      return true;
    }
    if ('name' in parent && parent.name === 'doc/table/token-overview/platform-mapping') {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

function walkNodes(node: BaseNode, fn: (node: BaseNode) => void): void {
  fn(node);
  if ('children' in node) {
    const children = (node as ChildrenMixin).children;
    for (let i = 0; i < children.length; i++) {
      walkNodes(children[i], fn);
    }
  }
}

function removeClaudeCommandsSection(page: PageNode): number {
  let removed = 0;
  const section = page.findOne(function (n) {
    return n.name === 'token-overview/claude-commands';
  });
  if (section !== null) {
    try {
      section.remove();
      removed += 1;
    } catch {
      /* ignore */
    }
  }
  return removed;
}

export async function buildTokenOverviewPage(ctx: CanvasBuildContext): Promise<CanvasBuildResult> {
  const started = Date.now();
  const warnings: string[] = [];

  const page = findStyleGuidePage('token-overview', ctx.pageId);
  await figma.setCurrentPageAsync(page);

  const variableMap = await ensureLocalVariableMap();
  await loadFontsForCanvas();

  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let primColl: VariableCollection | null = null;
  for (let ci = 0; ci < collections.length; ci++) {
    if (collections[ci].name === 'Primitives') {
      primColl = collections[ci];
      break;
    }
  }
  if (primColl === null) {
    for (let ci = 0; ci < collections.length; ci++) {
      if (/^(primitiv|core|foundation|base)/i.test(collections[ci].name)) {
        primColl = collections[ci];
        break;
      }
    }
  }
  const primModeId =
    primColl !== null && primColl.modes.length > 0 ? primColl.modes[0].modeId : null;

  const claudeRemoved = removeClaudeCommandsSection(page);
  if (claudeRemoved > 0) {
    pluginLog('[canvas] token-overview removed claude-commands section');
  }

  const pmTable = page.findOne(function (n) {
    return n.name === 'doc/table/token-overview/platform-mapping';
  });
  const pmTableId = pmTable !== null ? pmTable.id : null;

  if (pmTable !== null) {
    walkNodes(pmTable, function (n) {
      if (
        n.type === 'FRAME' ||
        n.type === 'COMPONENT' ||
        n.type === 'INSTANCE' ||
        n.type === 'GROUP'
      ) {
        try {
          (n as BlendMixin).effectStyleId = '';
          (n as BlendMixin).effects = [];
        } catch {
          /* ignore */
        }
      }
    });
  }

  const textStyles = await figma.getLocalTextStylesAsync();
  function styleId(name: string, fuzzyRe?: RegExp): string {
    for (let i = 0; i < textStyles.length; i++) {
      if (textStyles[i].name === name) {
        return textStyles[i].id;
      }
    }
    if (fuzzyRe !== undefined) {
      for (let i = 0; i < textStyles.length; i++) {
        if (fuzzyRe.test(textStyles[i].name)) {
          return textStyles[i].id;
        }
      }
    }
    return '';
  }

  const docSection = styleId('_Doc/Section', /^_?doc.*section/i);
  const docTokenName = styleId('_Doc/TokenName', /^_?doc.*(token|heading)/i);
  const docCode = styleId('_Doc/Code', /^_?doc.*(code|mono)/i);
  const docCaption = styleId('_Doc/Caption', /^_?doc.*(caption|label|body)/i);

  const pageContent = page.findOne(function (n) {
    return n.name === '_PageContent';
  }) as FrameNode | null;

  let textUpgraded = 0;
  if (pageContent !== null) {
    walkNodes(pageContent, function (n) {
      if (n.type !== 'TEXT') {
        return;
      }
      if (isUnderPlatformMappingTable(n, pmTableId)) {
        return;
      }
      try {
        const textNode = n as TextNode;
        const fs = textNode.fontSize;
        const fn = textNode.fontName;
        const st = fn !== figma.mixed ? fn.style : '';
        let pick = docCode;
        if (typeof fs === 'number' && fs >= 19) {
          pick = docSection;
        } else if (typeof fs === 'number' && fs >= 15 && String(st).indexOf('Semi') >= 0) {
          pick = docTokenName;
        } else if (typeof fs === 'number' && fs >= 13) {
          pick = docCode;
        } else {
          pick = docCaption;
        }
        if (pick !== '') {
          textNode.textStyleId = pick;
          textUpgraded += 1;
        }
      } catch {
        /* ignore */
      }
    });

    if (pmTable !== null) {
      walkNodes(pmTable, function (n) {
        if (n.type !== 'TEXT') {
          return;
        }
        const parentName = n.parent !== null && 'name' in n.parent ? String(n.parent.name) : '';
        try {
          if (parentName.indexOf('/cell/token') >= 0 && docTokenName !== '') {
            (n as TextNode).textStyleId = docTokenName;
          } else if (
            (parentName.indexOf('/cell/web') >= 0 ||
              parentName.indexOf('/cell/android') >= 0 ||
              parentName.indexOf('/cell/ios') >= 0) &&
            docCode !== ''
          ) {
            (n as TextNode).textStyleId = docCode;
          }
        } catch {
          /* ignore */
        }
      });
    }
  }

  const effectStyles = await figma.getLocalEffectStylesAsync();
  let shadowSmId = '';
  for (let ei = 0; ei < effectStyles.length; ei++) {
    if (effectStyles[ei].name === 'Effect/shadow-sm') {
      shadowSmId = effectStyles[ei].id;
      break;
    }
  }
  if (shadowSmId === '') {
    for (let ei = 0; ei < effectStyles.length; ei++) {
      if (/shadow.*sm/i.test(effectStyles[ei].name)) {
        shadowSmId = effectStyles[ei].id;
        break;
      }
    }
  }

  let shadowFrames = 0;
  if (pageContent !== null && shadowSmId !== '') {
    walkNodes(pageContent, function (n) {
      if (n.type !== 'FRAME') {
        return;
      }
      const frame = n as FrameNode;
      const nm = frame.name || '';
      if (isUnderPlatformMappingTable(frame, pmTableId)) {
        return;
      }
      if (
        nm.startsWith('token-overview/') ||
        nm === 'dark-mode-panel' ||
        nm === 'font-scale-panel'
      ) {
        try {
          if (!frame.effectStyleId) {
            frame.effectStyleId = shadowSmId;
            shadowFrames += 1;
          }
        } catch {
          /* ignore */
        }
      }
    });
  }

  let archBound = 0;
  for (let ai = 0; ai < ARCH_BIND.length; ai++) {
    const spec = ARCH_BIND[ai];
    const box = page.findOne(function (n) {
      return n.name === 'arch-box/' + spec.name;
    });
    if (box === null || box.type !== 'FRAME') {
      continue;
    }
    const actualPath = resolveCanonicalPath(spec.path, variableMap as VariablePathMap);
    if (actualPath === null) {
      continue;
    }
    const variable = variableMap[actualPath];
    if (variable === undefined) {
      continue;
    }
    try {
      bindPaintToVar(box, variable);
      archBound += 1;
    } catch {
      /* ignore */
    }
  }

  const phoneLight = page.findOne(function (n) {
    return n.name === 'phone-frame/light';
  });
  const phoneLightPath = resolveCanonicalPath(
    'color/background/default',
    variableMap as VariablePathMap,
  );
  if (phoneLight !== null && phoneLightPath !== null) {
    const variable = variableMap[phoneLightPath];
    if (variable !== undefined) {
      try {
        bindPaintToVar(phoneLight as GeometryMixin & MinimalFillsMixin, variable);
      } catch {
        /* ignore */
      }
    }
  }

  const phoneDark = page.findOne(function (n) {
    return n.name === 'phone-frame/dark';
  });
  const phoneDarkPath = resolveCanonicalPath('color/neutral/950', variableMap as VariablePathMap);
  if (phoneDark !== null && phoneDarkPath !== null) {
    const variable = variableMap[phoneDarkPath];
    if (variable !== undefined) {
      try {
        bindPaintToVar(phoneDark as GeometryMixin & MinimalFillsMixin, variable);
      } catch {
        /* ignore */
      }
    }
  }

  const minRows = loadPlatformMappingRows().rows;
  const rowPrefix = 'doc/table/token-overview/platform-mapping/row/';
  let cellsUpdated = 0;
  let staleRows = 0;
  let platformRowCount = 0;

  if (pmTable !== null && pmTable.type === 'FRAME') {
    const pmFrame = pmTable as FrameNode;
    const rowFrames = pmFrame.findAll(function (n: SceneNode) {
      return n.type === 'FRAME' && n.name.startsWith(rowPrefix) && n.name.indexOf('/cell/') < 0;
    });
    platformRowCount = rowFrames.length;

    for (let ri = 0; ri < rowFrames.length; ri++) {
      const row = rowFrames[ri] as FrameNode;
      const tokenPath = row.name.slice(rowPrefix.length);
      const actualPath = resolveCanonicalPath(tokenPath, variableMap as VariablePathMap);
      const variable = actualPath !== null ? variableMap[actualPath] : undefined;

      if (variable === undefined) {
        let minRow: (typeof minRows)[number] | undefined;
        for (let mi = 0; mi < minRows.length; mi++) {
          if (minRows[mi].tokenPath === tokenPath) {
            minRow = minRows[mi];
            break;
          }
        }
        if (minRow !== undefined && minRow.defaultHex !== '') {
          for (const key of ['web', 'android', 'ios']) {
            const cell = row.findOne(function (c) {
              return c.name === row.name + '/cell/' + key;
            });
            if (cell === null) {
              continue;
            }
            if (!('children' in cell)) {
              continue;
            }
            const children = (cell as ChildrenMixin).children;
            for (let ci = 0; ci < children.length; ci++) {
              const child = children[ci];
              if (
                child.type === 'TEXT' &&
                String((child as TextNode).characters) !== minRow.defaultHex
              ) {
                try {
                  (child as TextNode).characters = minRow.defaultHex;
                  cellsUpdated += 1;
                } catch {
                  /* ignore */
                }
              }
            }
          }
        } else {
          const tokCell = row.findOne(function (c) {
            return c.type === 'FRAME' && c.name.endsWith('/cell/token');
          });
          if (tokCell !== null && 'children' in tokCell) {
            const children = (tokCell as ChildrenMixin).children;
            for (let ci = 0; ci < children.length; ci++) {
              const child = children[ci];
              if (
                child.type === 'TEXT' &&
                String((child as TextNode).characters).indexOf('stale') < 0
              ) {
                try {
                  (child as TextNode).characters =
                    String((child as TextNode).characters) + ' · stale';
                  staleRows += 1;
                } catch {
                  /* ignore */
                }
              }
            }
          }
        }
        continue;
      }

      const cs = readCodeSyntax(variable);
      for (const pair of [
        ['web', cs.WEB],
        ['android', cs.ANDROID],
        ['ios', cs.iOS],
      ] as const) {
        const key = pair[0];
        const val = pair[1];
        const cell = row.findOne(function (c) {
          return c.name === row.name + '/cell/' + key;
        });
        if (cell === null || !('children' in cell)) {
          continue;
        }
        const children = (cell as ChildrenMixin).children;
        const nextText = val !== '' ? val : '—';
        for (let ci = 0; ci < children.length; ci++) {
          const child = children[ci];
          if (child.type === 'TEXT' && String((child as TextNode).characters) !== nextText) {
            try {
              (child as TextNode).characters = nextText;
              cellsUpdated += 1;
            } catch {
              /* ignore */
            }
          }
        }
      }
    }
  }

  let placeholdersRemoved = 0;
  if (pageContent !== null) {
    const toRemove: SceneNode[] = [];
    walkNodes(pageContent, function (n) {
      if ('name' in n && n.name.startsWith('placeholder/')) {
        toRemove.push(n as SceneNode);
      }
    });
    for (let pi = 0; pi < toRemove.length; pi++) {
      try {
        toRemove[pi].remove();
        placeholdersRemoved += 1;
      } catch {
        /* ignore */
      }
    }
  }

  let tbdFixed = 0;
  let fallbackHex = '#2563eb';
  const p500Path = resolveCanonicalPath('color/primary/500', variableMap as VariablePathMap);
  const p500 = p500Path !== null ? variableMap[p500Path] : undefined;
  if (p500 !== undefined && primModeId !== null) {
    const raw = await resolveRawValue(p500.id, primModeId);
    fallbackHex = colorToHex(raw);
  }

  if (pageContent !== null) {
    walkNodes(pageContent, function (n) {
      if (n.type !== 'TEXT') {
        return;
      }
      const textNode = n as TextNode;
      if (String(textNode.characters).indexOf('TBD') >= 0) {
        try {
          textNode.characters = String(textNode.characters).replace(/TBD/g, fallbackHex);
          tbdFixed += 1;
        } catch {
          /* ignore */
        }
      }
    });
  }

  const durationMs = Date.now() - started;
  const stats = {
    textStyleUpgrades: textUpgraded,
    shadowFramesApplied: shadowFrames,
    platformCellsUpdated: cellsUpdated,
    staleRowsMarked: staleRows,
    placeholdersRemoved: placeholdersRemoved,
    tbdReplacements: tbdFixed,
    archBoxesBound: archBound,
    platformMappingRows: platformRowCount,
  };

  const audit = await runAudit('canvas', {
    builder: 'token-overview',
    page: page,
    stats: stats,
  });

  pluginLog('[canvas] buildTokenOverviewPage done', String(durationMs) + 'ms', stats);

  return {
    ok: audit.passed,
    builder: 'token-overview',
    durationMs: durationMs,
    pageId: page.id,
    pageName: page.name,
    tableCount: pmTable !== null ? 1 : 0,
    swatchCount: platformRowCount,
    warnings: warnings,
    audit: audit,
    stats: stats,
  };
}
