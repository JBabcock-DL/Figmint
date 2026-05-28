import { useCallback, useEffect, useState } from 'react';

import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import { buildDefaultHeadBranch } from '@/io/github/branchName';
import { buildPrBody } from '@/io/github/prBody';
import { loadFromGitHub } from '@/io/sources/github';
import { RepoSyncCard } from '@/ui/components/RepoSyncCard';
import type { UseGitHubConnectResult } from '@/ui/github/useGitHubConnect';

const DEFAULT_TOKENS_PATH = 'design/tokens.json';

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

export interface SettingsProps {
  repoUrl: string;
  tokensPath: string;
  onRepoUrlChange: (value: string) => void;
  onTokensPathChange: (value: string) => void;
  github: UseGitHubConnectResult;
}

export function Settings({
  repoUrl,
  tokensPath,
  onRepoUrlChange,
  onTokensPathChange,
  github,
}: SettingsProps) {
  const [readResult, setReadResult] = useState('');
  const [prResult, setPrResult] = useState('');
  const [repoTokens, setRepoTokens] = useState<TokensV1 | null>(null);

  useEffect(
    function () {
      if (!github.connected) {
        setRepoTokens(null);
        return;
      }
      void loadFromGitHub(repoUrl, tokensPath).then(function (result) {
        if ('payload' in result && result.kind === 'tokens') {
          setRepoTokens(result.payload);
        }
      });
    },
    [github.connected, repoUrl, tokensPath],
  );

  const handleTestRead = useCallback(async function () {
    setReadResult('Reading…');
    const result = await loadFromGitHub(repoUrl, tokensPath);
    if ('payload' in result) {
      setReadResult('Loaded ' + result.kind + ' via github');
      return;
    }
    setReadResult(result.message);
  }, [repoUrl, tokensPath]);

  const handleOpenTestPr = useCallback(async function () {
    setPrResult('Opening test PR…');
    const requestId = 'settings-pr-' + String(Date.now());
    const headBranch = buildDefaultHeadBranch('test-export', new Date());
    const testContent = JSON.stringify(
      {
        v: 1,
        kind: 'ops-program',
        meta: { generatedAt: new Date().toISOString(), source: 'fighub-settings-test' },
        steps: [],
      },
      null,
      2,
    );
    const filePath = 'docs/fighub/test-export.v1.json';
    const commitMessage = 'fighub: test export (WO-016)';
    const prBody = buildPrBody({
      commitMessage: commitMessage,
      files: [{ path: filePath, format: 'json' }],
      pluginVersion: import.meta.env.PACKAGE_VERSION,
      figmaFileUrl: 'https://www.figma.com/design/unknown/Plugin-Sandbox',
      figmaFileName: 'Plugin Sandbox',
      contractKind: 'test-export',
    });

    await new Promise<void>(function (resolve) {
      function onMessage(event: MessageEvent<unknown>) {
        const data = event.data;
        if (typeof data !== 'object' || data === null || !('pluginMessage' in data)) {
          return;
        }
        const message = (data as { pluginMessage: Record<string, unknown> }).pluginMessage;
        if (message.type === 'github/pr/test-result' && message.requestId === requestId) {
          window.removeEventListener('message', onMessage);
          if (message.ok === true && typeof message.prUrl === 'string') {
            setPrResult('Opened PR: ' + message.prUrl + ' (' + headBranch + ')');
          } else {
            setPrResult(
              typeof message.error === 'string' ? message.error : 'Failed to open test PR.',
            );
          }
          resolve();
        }
      }

      window.addEventListener('message', onMessage);
      parent.postMessage(
        {
          pluginMessage: {
            type: 'github/pr/test-open',
            requestId: requestId,
            repoUrl: repoUrl,
            headBranch: headBranch,
            filePath: filePath,
            fileContent: testContent,
            commitMessage: commitMessage,
            prTitle: commitMessage,
            prBody: prBody,
          },
        },
        '*',
      );
    });
  }, [repoUrl]);

  return (
    <section aria-label="GitHub settings" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
          OAuth relay not reachable. Run <code>npm run spike:oauth-relay</code> and rebuild if needed.
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
        <label style={{ color: '#666', display: 'block', fontSize: '11px', marginTop: '8px' }}>
          Tokens path
          <input
            type="text"
            value={tokensPath}
            onChange={function (event) {
              onTokensPathChange(event.target.value);
            }}
            placeholder={DEFAULT_TOKENS_PATH}
            style={inputStyle}
          />
        </label>
        <p style={{ color: '#666', fontSize: '10px', lineHeight: 1.45, margin: '6px 0 0' }}>
          Component registry is stored in the Figma file (canvas snapshot). Repo sync paths ship in
          WO-058 Phase 2 via <code>fighub.json</code>.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          <button
            type="button"
            disabled={github.oauthPhase === 'polling' || github.relayOk !== true}
            onClick={function () {
              void github.connect();
            }}
            style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px' }}
          >
            {github.oauthPhase === 'polling' ? 'Authorizing…' : 'Connect GitHub'}
          </button>
          <button
            type="button"
            disabled={!github.connected}
            onClick={github.disconnect}
            style={{ fontSize: '11px', padding: '4px 10px' }}
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
        <RepoSyncCard
          repoUrl={repoUrl}
          tokensPath={tokensPath}
          connected={github.connected}
          repoTokens={repoTokens !== null ? repoTokens : undefined}
        />
      ) : null}

      <div style={sectionStyle}>
        <h2 style={{ fontSize: '13px', margin: '0 0 8px' }}>Read smoke test</h2>
        <button
          type="button"
          disabled={!github.connected}
          onClick={function () {
            void handleTestRead();
          }}
          style={{ fontSize: '11px', padding: '4px 10px' }}
        >
          Test read tokens path
        </button>
        {readResult ? (
          <p role="status" style={{ color: '#666', fontSize: '11px', margin: '8px 0 0' }}>
            {readResult}
          </p>
        ) : null}
      </div>

      <div style={sectionStyle}>
        <h2 style={{ fontSize: '13px', margin: '0 0 8px' }}>PR smoke test (dev)</h2>
        <button
          type="button"
          disabled={!github.connected}
          onClick={function () {
            void handleOpenTestPr();
          }}
          style={{ fontSize: '11px', padding: '4px 10px' }}
        >
          Open test PR
        </button>
        {prResult ? (
          <p role="status" style={{ color: '#666', fontSize: '11px', margin: '8px 0 0' }}>
            {prResult}
          </p>
        ) : null}
      </div>
    </section>
  );
}
