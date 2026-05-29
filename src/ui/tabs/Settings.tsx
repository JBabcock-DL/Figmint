import { useCallback, useEffect, useState } from 'react';

import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import { isAdaptedTokensV1 } from '@/io/messages/push';
import { adapt } from '@/io/sources/adapters';
import { loadFromGitHub } from '@/io/sources/github';
import type { LoadedDocument, ValidationError } from '@/io/sources/types';
import type { RepoTokensWireFormat } from '@/io/sources/adapters/serializeTokensWire';
import { RepoSyncCard } from '@/ui/components/RepoSyncCard';
import type { UseGitHubConnectResult } from '@/ui/github/useGitHubConnect';
import { useRepoSync } from '@/ui/sync/useRepoSync';

const sectionStyle = {
  border: '1px solid #ddd',
  borderRadius: '6px',
  padding: '10px',
} as const;

const inputStyle = {
  boxSizing: 'border-box' as const,
  fontSize: '11px',
  marginTop: '4px',
  padding: '6px 8px',
  width: '100%',
};

const DEFAULT_TOKENS_PATH = 'design/tokens.json';

function isTokenWireDocument(doc: LoadedDocument): boolean {
  return doc.kind === 'tokens-dtcg' || doc.kind === 'tokens-legacy';
}

function tokensFromGitHubLoad(
  result: LoadedDocument | ValidationError,
):
  | { ok: true; tokens: TokensV1; wireFormat: RepoTokensWireFormat; message: string }
  | { ok: false; message: string } {
  if (!('payload' in result)) {
    return { ok: false, message: result.message };
  }
  if (!isTokenWireDocument(result)) {
    return { ok: false, message: 'Expected tokens at path; got ' + result.kind };
  }
  const adapted = adapt(result.payload);
  if (!isAdaptedTokensV1(adapted)) {
    const detail = adapted.kind === 'format-error' ? adapted.message : 'Token adapter failed';
    return { ok: false, message: detail };
  }
  const wireFormat: RepoTokensWireFormat = result.kind === 'tokens-dtcg' ? 'dtcg' : 'canonical';
  return {
    ok: true,
    tokens: adapted,
    wireFormat: wireFormat,
    message:
      'Loaded tokens via github (' +
      result.kind +
      ', ' +
      String(adapted.tokens.length) +
      ' tokens)',
  };
}

export interface SettingsProps {
  repoUrl: string;
  onRepoUrlChange: (value: string) => void;
  github: UseGitHubConnectResult;
  sessionResolvedConfig?: import('@detroitlabs/fighub-contracts').ResolvedFigHubConfig | null;
  sessionLastFetchedAt?: string | null;
  sessionLastPulledAt?: string | null;
  sessionLastPushedAt?: string | null;
  sessionConfigWarning?: string | null;
}

export function Settings({
  repoUrl,
  onRepoUrlChange,
  github,
  sessionResolvedConfig,
  sessionLastFetchedAt,
  sessionLastPulledAt,
  sessionLastPushedAt,
  sessionConfigWarning,
}: SettingsProps) {
  const [repoTokens, setRepoTokens] = useState<TokensV1 | null>(null);
  const [repoTokensWireFormat, setRepoTokensWireFormat] = useState<RepoTokensWireFormat>('dtcg');
  const [loadStatus, setLoadStatus] = useState('');

  const sync = useRepoSync({
    repoUrl: repoUrl,
    connected: github.connected,
    initialResolvedConfig: sessionResolvedConfig,
    initialLastFetchedAt: sessionLastFetchedAt,
    initialLastPulledAt: sessionLastPulledAt,
    initialLastPushedAt: sessionLastPushedAt,
    initialConfigWarning: sessionConfigWarning,
  });

  const tokensPath =
    sync.resolvedConfig !== null && sync.resolvedConfig.tokensPath.length > 0
      ? sync.resolvedConfig.tokensPath
      : DEFAULT_TOKENS_PATH;

  const applyLoadedTokens = useCallback(function (
    result: Awaited<ReturnType<typeof loadFromGitHub>>,
  ) {
    const applied = tokensFromGitHubLoad(result);
    if (applied.ok) {
      setRepoTokens(applied.tokens);
      setRepoTokensWireFormat(applied.wireFormat);
      setLoadStatus(applied.message);
      return applied;
    }
    setRepoTokens(null);
    setRepoTokensWireFormat('dtcg');
    setLoadStatus(applied.message);
    return applied;
  }, []);

  const loadTokensForDrift = useCallback(
    async function (): Promise<TokensV1 | null> {
      if (!github.connected || repoUrl.length === 0) {
        setRepoTokens(null);
        return null;
      }
      const result = await loadFromGitHub(repoUrl, tokensPath);
      const applied = applyLoadedTokens(result);
      return applied.ok ? applied.tokens : null;
    },
    [github.connected, repoUrl, tokensPath, applyLoadedTokens],
  );

  useEffect(
    function () {
      if (!github.connected) {
        setRepoTokens(null);
        setLoadStatus('');
        return;
      }
      if (sync.lastPulledAt !== null || sync.lastFetchedAt !== null) {
        void loadTokensForDrift();
      }
    },
    [github.connected, sync.lastPulledAt, sync.lastFetchedAt, loadTokensForDrift],
  );

  return (
    <section
      aria-label="GitHub settings"
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      {github.relayOk === false ? (
        <div
          role="alert"
          style={{
            background: '#fff3f3',
            border: '1px solid #e6a8a8',
            borderRadius: '6px',
            color: '#8a1f1f',
            fontSize: '11px',
            padding: '8px 10px',
          }}
        >
          OAuth relay not reachable. Run <code>npm run spike:oauth-relay</code> and rebuild if
          needed.
        </div>
      ) : null}

      <div style={sectionStyle}>
        <h2 style={{ fontSize: '13px', margin: '0 0 8px' }}>Connected repository</h2>
        <label style={{ color: '#666', display: 'block', fontSize: '11px' }}>
          Repo URL
          <input
            type="url"
            value={repoUrl}
            onChange={function (event) {
              onRepoUrlChange(event.target.value);
            }}
            placeholder="https://github.com/owner/repo"
            style={inputStyle}
          />
        </label>
        <p style={{ color: '#666', fontSize: '10px', lineHeight: 1.45, margin: '6px 0 0' }}>
          Repo paths come from optional root <code>fighub.json</code> after Fetch latest. Component
          registry lives in the Figma file (canvas snapshot).
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          <button
            type="button"
            disabled={github.oauthPhase === 'polling' || github.relayOk !== true}
            onClick={function () {
              void github.connect();
            }}
            style={{
              fontSize: '11px',
              fontWeight: 600,
              minHeight: 44,
              minWidth: 44,
              padding: '8px 12px',
            }}
          >
            {github.oauthPhase === 'polling' ? 'Authorizing…' : 'Connect GitHub'}
          </button>
          <button
            type="button"
            disabled={!github.connected}
            onClick={github.disconnect}
            style={{ fontSize: '11px', minHeight: 44, minWidth: 44, padding: '8px 12px' }}
          >
            Disconnect
          </button>
        </div>
        {github.device && github.oauthPhase !== 'idle' ? (
          <p style={{ fontSize: '11px', margin: '8px 0 0' }}>
            Code: <strong>{github.device.user_code}</strong> —{' '}
            <a href={github.device.verification_uri} target="_blank" rel="noreferrer">
              Open GitHub device login
            </a>
          </p>
        ) : null}
        <p role="status" style={{ color: '#333', fontSize: '11px', margin: '8px 0 0' }}>
          {github.statusMessage}
          {github.tokenPreview ? ' · token ' + github.tokenPreview : ''}
        </p>
      </div>

      {github.connected ? (
        <>
          <RepoSyncCard
            repoUrl={repoUrl}
            connected={github.connected}
            sync={sync}
            repoTokens={repoTokens !== null ? repoTokens : undefined}
            repoTokensWireFormat={repoTokensWireFormat}
            onAfterFetch={loadTokensForDrift}
          />
          {loadStatus ? (
            <p role="status" style={{ color: '#666', fontSize: '11px', margin: 0 }}>
              {loadStatus}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
