import { vi } from 'vitest';

import type { UseGitHubConnectResult } from '@/ui/github/useGitHubConnect';

/** Minimal GitHub connect stub for tab unit tests. */
export function createMockGitHubConnect(
  overrides: Partial<UseGitHubConnectResult> = {},
): UseGitHubConnectResult {
  return {
    oauthPhase: 'idle',
    statusMessage: '',
    device: null,
    relayOk: true,
    connected: false,
    tokenPreview: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    probeConnection: vi.fn(),
    ...overrides,
  };
}
