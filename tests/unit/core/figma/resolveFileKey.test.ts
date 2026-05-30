/// <reference types="@figma/plugin-typings" />

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearManualFigmaFileKeyOverride,
  fileKeyResolutionWarning,
  parseFigmaFileKeyInput,
  readManualFigmaFileKeyOverride,
  resolveFigmaFileKey,
  writeManualFigmaFileKeyOverride,
} from '@/core/figma/resolveFileKey';

import {
  clearManualFileKeyOverrideForTests,
  installHandoffFigmaMock,
  restoreHandoffFigmaMock,
} from '../../../mocks/handoffFigma';
import { createMockExportableNode } from '../../../mocks/handoffFigma';

describe('parseFigmaFileKeyInput', () => {
  it('parses a full design URL', function () {
    expect(
      parseFigmaFileKeyInput(
        'https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox?node-id=0-1',
      ),
    ).toBe('cVdPraIafWFBRZnzMPhtrW');
  });

  it('parses a bare file key', function () {
    expect(parseFigmaFileKeyInput('cVdPraIafWFBRZnzMPhtrW')).toBe('cVdPraIafWFBRZnzMPhtrW');
  });

  it('rejects short garbage input', function () {
    expect(parseFigmaFileKeyInput('abc')).toBeNull();
  });

  it('rejects empty input', function () {
    expect(parseFigmaFileKeyInput('   ')).toBeNull();
  });
});

describe('resolveFigmaFileKey', () => {
  afterEach(function () {
    restoreHandoffFigmaMock();
  });

  it('prefers native figma.fileKey over override', function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode()],
      fileKey: 'nativeKey1234',
      manualFileKey: 'overrideKey123',
    });

    expect(resolveFigmaFileKey()).toEqual({ fileKey: 'nativeKey1234', source: 'api' });
  });

  it('uses manual override when native key is unavailable', function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode()],
      fileKey: undefined,
      manualFileKey: 'manualKey1234',
    });

    expect(resolveFigmaFileKey()).toEqual({ fileKey: 'manualKey1234', source: 'override' });
  });

  it('returns none when neither native nor override exists', function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode()],
      fileKey: undefined,
    });

    expect(resolveFigmaFileKey()).toEqual({ fileKey: '', source: 'none' });
  });

  it('reads and writes override via root pluginData', function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode()],
      fileKey: undefined,
    });

    writeManualFigmaFileKeyOverride('storedKey1234');
    expect(readManualFigmaFileKeyOverride()).toBe('storedKey1234');
    clearManualFigmaFileKeyOverride();
    expect(readManualFigmaFileKeyOverride()).toBe('');
  });
});

describe('fileKeyResolutionWarning', () => {
  afterEach(function () {
    restoreHandoffFigmaMock();
  });

  it('returns null when a key is resolved', function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode()],
      fileKey: 'abc1234567',
    });
    expect(fileKeyResolutionWarning(resolveFigmaFileKey())).toBeNull();
  });

  it('warns for undefined native key', function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode()],
      fileKey: undefined,
    });
    expect(fileKeyResolutionWarning({ fileKey: '', source: 'none' })).toContain('Settings');
    expect(fileKeyResolutionWarning({ fileKey: '', source: 'none' })).toContain('private plugin API');
  });

  it('warns for empty native key on unsaved file', function () {
    installHandoffFigmaMock({
      selection: [createMockExportableNode()],
      fileKey: '',
    });
    expect(fileKeyResolutionWarning({ fileKey: '', source: 'none' })).toContain('save this file');
  });
});

describe('capture override path', () => {
  beforeEach(function () {
    clearManualFileKeyOverrideForTests();
  });

  afterEach(function () {
    restoreHandoffFigmaMock();
  });

  it('builds deep links from manual override when native key missing', async function () {
    const { captureSelection } = await import('@/core/handoff/capture');
    installHandoffFigmaMock({
      selection: [createMockExportableNode({ id: '18:5', name: '_PageContent' })],
      fileKey: undefined,
      manualFileKey: 'cVdPraIafWFBRZnzMPhtrW',
    });

    const result = await captureSelection();

    expect(result.fileKeySource).toBe('override');
    expect(result.frames[0].deepLink).toContain('cVdPraIafWFBRZnzMPhtrW');
    expect(result.frames[0].deepLink).toContain('node-id=18-5');
    expect(result.warnings).toHaveLength(0);
  });
});
