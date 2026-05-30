import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildDeepLink, pngToDataUrl } from '@/core/handoff/capture';

import { decodeFixturePng } from '../../../mocks/handoffFigma';

const FIXTURE_BASE64 = readFileSync(
  resolve(__dirname, '../../../fixtures/handoff/1x1.png.base64.txt'),
  'utf8',
).trim();

describe('handoff capture helpers', () => {
  it('returns empty deep link when fileKey is blank', () => {
    expect(buildDeepLink('', 'Untitled', '1:2')).toBe('');
  });

  it('encodes spaces in file name', () => {
    expect(buildDeepLink('abc123', 'My Design File', '1:2')).toBe(
      'https://www.figma.com/design/abc123/My%20Design%20File?node-id=1-2',
    );
  });

  it('converts node id colons to dashes', () => {
    expect(buildDeepLink('abc123', 'File', '12:34')).toBe(
      'https://www.figma.com/design/abc123/File?node-id=12-34',
    );
  });

  it('builds a valid design URL for typical inputs', () => {
    expect(buildDeepLink('key', 'Checkout', '99:1')).toMatch(
      /^https:\/\/www\.figma\.com\/design\/key\/Checkout\?node-id=99-1$/,
    );
  });

  it('prefixes png bytes as a data URL', () => {
    const dataUrl = pngToDataUrl(decodeFixturePng());
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('round-trips fixture png base64 payload', () => {
    const dataUrl = pngToDataUrl(decodeFixturePng());
    expect(dataUrl.endsWith(FIXTURE_BASE64)).toBe(true);
  });
});
