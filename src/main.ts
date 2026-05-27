// Figma plugin main-thread entry. ES2017 target (Figma's QuickJS sandbox rejects
// ES2020+ syntax — optional chaining, nullish coalescing, replaceAll). The UI HTML
// is injected at build time via Vite's `define.__html__`, which reads the finalized
// `dist/ui.html` produced by the UI build pass — see vite.config.ts.

import { runBootstrap } from '@/core/bootstrap/runBootstrap';
import { pushTokens } from '@/core/variables';
import { runCanvasBench } from '@/core/canvas/bench';
import { buildPrimitivesPage } from '@/core/canvas/colorTables';
import { buildThemePage } from '@/core/canvas/themeTables';
import { buildTextStylesPage } from '@/core/canvas/textStyles';
import { buildEffectsPage } from '@/core/canvas/effects';
import { buildLayoutPage } from '@/core/canvas/layout';
import { buildTokenOverviewPage } from '@/core/canvas/tokenOverview';
import type { CanvasBuildContext } from '@/core/canvas/types';
import { pluginLog } from '@/core/pluginLog';
import {
  isCanvasBenchMessage,
  isCanvasBuildPageMessage,
  type CanvasBenchResultMessage,
  type CanvasBuildErrorMessage,
  type CanvasBuildResultMessage,
} from '@/io/messages/canvas';
import { isBootstrapRunMessage } from '@/io/messages/bootstrap';
import {
  isPushVariablesMessage,
  type PushErrorMessage,
  type PushResultMessage,
} from '@/io/messages/push';
import type { ContractKind } from '@/io/sources/types';

figma.showUI(__html__, { width: 420, height: 520 });

/** UI → main thread messages (Sprint 4 ops dispatch will extend this union). */
interface IoLoadedMessage {
  type: 'io/loaded';
  kind: ContractKind;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIoLoadedMessage(message: unknown): message is IoLoadedMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'io/loaded' && typeof message.kind === 'string';
}

function extractErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

async function handlePushVariables(
  tokens: import('@detroitlabs/figmint-contracts').TokensV1,
): Promise<void> {
  try {
    const outcome = await pushTokens(tokens);
    const response: PushResultMessage = {
      type: 'push/result',
      result: {
        created: outcome.created,
        updated: outcome.updated,
        skipped: outcome.skipped,
        errors: outcome.errors,
        passes: outcome.passes,
        evc: outcome.evc,
        totalDurationMs: outcome.totalDurationMs,
      },
      audit: outcome.audit,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] push/variables done', String(outcome.totalDurationMs) + 'ms', {
      created: outcome.created,
      updated: outcome.updated,
      skipped: outcome.skipped,
      errors: outcome.errors.length,
      auditPassed: outcome.audit.passed,
    });
  } catch (error) {
    const errResponse: PushErrorMessage = {
      type: 'push/error',
      message: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog('[main] push/variables failed', errResponse.message);
  }
}

async function handleCanvasBuildPage(
  page: 'primitives' | 'theme' | 'text-styles' | 'token-overview' | 'layout' | 'effects',
  tokens: import('@detroitlabs/figmint-contracts').TokensV1,
): Promise<void> {
  try {
    const target = { pageSlug: page };
    let result;
    if (page === 'primitives') {
      result = await buildPrimitivesPage(tokens, target);
    } else if (page === 'theme') {
      result = await buildThemePage(tokens, target);
    } else {
      const ctx: CanvasBuildContext = { tokens: tokens };
      if (page === 'text-styles') {
        result = await buildTextStylesPage(ctx);
      } else if (page === 'token-overview') {
        result = await buildTokenOverviewPage(ctx);
      } else if (page === 'layout') {
        result = await buildLayoutPage(ctx);
      } else {
        result = await buildEffectsPage(ctx);
      }
    }
    const response: CanvasBuildResultMessage = {
      type: 'canvas/result',
      result: result,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] canvas/build-page done', page, String(result.durationMs) + 'ms', {
      tableCount: result.tableCount,
      swatchCount: result.swatchCount,
    });
  } catch (error) {
    const errResponse: CanvasBuildErrorMessage = {
      type: 'canvas/error',
      message: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog('[main] canvas/build-page failed', page, errResponse.message);
  }
}

async function handleCanvasBench(
  page: 'primitives' | 'theme' | 'text-styles' | 'token-overview' | 'layout' | 'effects',
  tokens: import('@detroitlabs/figmint-contracts').TokensV1,
  label?: string,
): Promise<void> {
  try {
    const target = { pageSlug: page };
    const benchLabel = label !== undefined && label !== '' ? label : 'canvas-bench-' + page;
    const result = await runCanvasBench(benchLabel, function () {
      if (page === 'primitives') {
        return buildPrimitivesPage(tokens, target).then(function (buildResult) {
          return { swatchCount: buildResult.swatchCount };
        });
      }
      if (page === 'theme') {
        return buildThemePage(tokens, target).then(function (buildResult) {
          return { swatchCount: buildResult.swatchCount };
        });
      }
      const ctx: CanvasBuildContext = { tokens: tokens };
      if (page === 'text-styles') {
        return buildTextStylesPage(ctx).then(function (buildResult) {
          return { swatchCount: buildResult.swatchCount };
        });
      }
      if (page === 'token-overview') {
        return buildTokenOverviewPage(ctx).then(function (buildResult) {
          return { swatchCount: buildResult.swatchCount };
        });
      }
      if (page === 'layout') {
        return buildLayoutPage(ctx).then(function (buildResult) {
          return { swatchCount: buildResult.swatchCount };
        });
      }
      return buildEffectsPage(ctx).then(function (buildResult) {
        return { swatchCount: buildResult.swatchCount };
      });
    });
    const response: CanvasBenchResultMessage = {
      type: 'canvas/bench-result',
      result: result,
    };
    figma.ui.postMessage(response);
    pluginLog('[main] canvas/bench done', page, String(result.totalDurationMs) + 'ms');
  } catch (error) {
    const errResponse: CanvasBuildErrorMessage = {
      type: 'canvas/error',
      message: extractErrorMessage(error),
    };
    figma.ui.postMessage(errResponse);
    pluginLog('[main] canvas/bench failed', page, errResponse.message);
  }
}

figma.ui.onmessage = (message: unknown) => {
  if (isBootstrapRunMessage(message)) {
    runBootstrap(message.tokens, message.options).catch(function (error: unknown) {
      figma.ui.postMessage({
        type: 'bootstrap/error',
        message: extractErrorMessage(error),
      });
      pluginLog('[main] bootstrap/run unhandled', extractErrorMessage(error));
    });
    return;
  }

  // Dev/bench: direct push handler retained until Sprint 4 ops dispatch replaces it.
  if (isPushVariablesMessage(message)) {
    handlePushVariables(message.tokens).catch(function (error: unknown) {
      const errResponse: PushErrorMessage = {
        type: 'push/error',
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
      pluginLog('[main] push/variables unhandled', errResponse.message);
    });
    return;
  }

  if (isCanvasBuildPageMessage(message)) {
    handleCanvasBuildPage(message.page, message.tokens).catch(function (error: unknown) {
      const errResponse: CanvasBuildErrorMessage = {
        type: 'canvas/error',
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
      pluginLog('[main] canvas/build-page unhandled', errResponse.message);
    });
    return;
  }

  if (isCanvasBenchMessage(message)) {
    handleCanvasBench(message.page, message.tokens, message.label).catch(function (error: unknown) {
      const errResponse: CanvasBuildErrorMessage = {
        type: 'canvas/error',
        message: extractErrorMessage(error),
      };
      figma.ui.postMessage(errResponse);
      pluginLog('[main] canvas/bench unhandled', errResponse.message);
    });
    return;
  }

  if (!isIoLoadedMessage(message)) {
    return;
  }
  // Sprint 4 (ops-protocol) wires loaded documents into the deterministic core.
  pluginLog('[main] io/loaded', message.kind);
};
