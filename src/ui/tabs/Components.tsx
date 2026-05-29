import { useCallback, useEffect, useMemo, useReducer, useState, type CSSProperties } from 'react';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import {
  isScaffoldErrorMessage,
  isScaffoldProgressMessage,
  isScaffoldResultMessage,
} from '@/io/messages/scaffold';
import type { LoadedDocument } from '@/io/sources/types';
import { AuditPanel } from '@/ui/components/AuditPanel';
import { classifyComponentsIngest } from '@/ui/components/scaffold/ingestDocument';
import { loadRegistryForComponentsTab } from '@/ui/components/scaffold/loadRegistryFromSnapshot';
import { syncRegistryLoadedMessage } from '@/ui/components/scaffold/registryLoadMessages';
import { resolveComponentSpecFromRepo } from '@/ui/components/scaffold/resolveComponentSpec';
import {
  countCompletedSteps,
  createInitialScaffoldProgressState,
  reduceScaffoldProgress,
} from '@/ui/components/scaffold/scaffoldProgressReducer';
import { ScaffoldStepList } from '@/ui/components/scaffold/ScaffoldStepList';
import { SpecPreviewPanel } from '@/ui/components/scaffold/SpecPreviewPanel';
import {
  validateComponentSpecDraft,
  validateSpecJsonField,
} from '@/ui/components/scaffold/validateSpecDraft';
import {
  countVariantCrossProduct,
  detectCssSelectorWarnings,
} from '@/ui/components/variantMatrixPreview';
import { formatRepoDisplay } from '@/ui/github/formatRepoDisplay';
import type { UseGitHubConnectResult } from '@/ui/github/useGitHubConnect';
import { ClipboardBanner, useClipboardSources } from '@/ui/sources/ClipboardBanner';
import { SourceDropZone, SourceFilePicker } from '@/ui/sources/SourceFilePicker';
import { SourcePasteTextarea } from '@/ui/sources/SourcePasteTextarea';

const SECTION_HEADING: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  margin: '0 0 8px',
};

const SECTION_BORDER: CSSProperties = {
  border: '1px solid #ccc',
  borderRadius: 4,
  padding: 12,
};

function cloneSpec(spec: ComponentSpecV1): ComponentSpecV1 {
  return JSON.parse(JSON.stringify(spec)) as ComponentSpecV1;
}

export interface ComponentsTabProps {
  repoUrl: string;
  github: UseGitHubConnectResult;
  specsPath?: string;
  onOpenSettings?: () => void;
}

export function Components({
  repoUrl,
  github,
  specsPath,
  onOpenSettings,
}: ComponentsTabProps) {
  const [registryKeys, setRegistryKeys] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [registryStatus, setRegistryStatus] = useState('');
  const [draft, setDraft] = useState<ComponentSpecV1 | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [validation, setValidation] = useState<
    Awaited<ReturnType<typeof validateComponentSpecDraft>> | null
  >(null);
  const [showAudit, setShowAudit] = useState(false);

  const [progressState, dispatchProgress] = useReducer(
    reduceScaffoldProgress,
    undefined,
    createInitialScaffoldProgressState,
  );

  const variantCount = useMemo(
    function () {
      if (draft === null) {
        return 0;
      }
      return countVariantCrossProduct(draft.variantMatrix);
    },
    [draft],
  );

  const selectorWarnings = useMemo(
    function () {
      if (draft === null) {
        return [];
      }
      return detectCssSelectorWarnings(draft.bindings);
    },
    [draft],
  );

  useEffect(
    function () {
      if (draft === null) {
        setValidation(null);
        return;
      }
      let cancelled = false;
      void validateComponentSpecDraft(draft).then(function (result) {
        if (!cancelled) {
          setValidation(result);
        }
      });
      return function () {
        cancelled = true;
      };
    },
    [draft],
  );

  const applyLoadedDocument = useCallback(function (doc: LoadedDocument) {
    const outcome = classifyComponentsIngest(doc);
    if (!outcome.ok) {
      setIngestError(outcome.message);
      return;
    }
    setIngestError(null);
    if (outcome.kind === 'component-spec') {
      setDraft(cloneSpec(outcome.spec));
      setSourceLabel('Loaded component-spec via ' + doc.sourceMeta.port);
      dispatchProgress({ type: 'scaffold/reset' });
      return;
    }
    setRegistryKeys(Object.keys(outcome.registry.components).sort());
    setSourceLabel('Loaded registry via ' + doc.sourceMeta.port);
  }, []);

  const handleSourceResult = useCallback(
    function (result: LoadedDocument | import('@/io/sources/types').ValidationError) {
      if (!('payload' in result)) {
        setIngestError(result.message);
        return;
      }
      applyLoadedDocument(result);
    },
    [applyLoadedDocument],
  );

  const refreshRegistryFromSnapshot = useCallback(async function () {
    setRegistryStatus('Loading canvas snapshot…');
    const loaded = await loadRegistryForComponentsTab();
    if (!loaded.ok) {
      setRegistryStatus(loaded.message);
      setRegistryKeys([]);
      return;
    }
    setRegistryKeys(
      loaded.registry !== null ? Object.keys(loaded.registry.components).sort() : [],
    );
    setRegistryStatus(loaded.message !== undefined ? loaded.message : syncRegistryLoadedMessage(
      loaded.registry !== null ? Object.keys(loaded.registry.components).length : 0,
    ));
  }, []);

  useEffect(
    function () {
      void refreshRegistryFromSnapshot();
    },
    [refreshRegistryFromSnapshot],
  );

  const handleSelectRegistryKey = useCallback(
    async function (key: string) {
      setSelectedKey(key);
      if (!github.connected || repoUrl.length === 0 || key.length === 0) {
        return;
      }
      setRegistryStatus('Resolving spec for ' + key + '…');
      const resolved = await resolveComponentSpecFromRepo(repoUrl, key, specsPath);
      if (!resolved.ok) {
        setRegistryStatus(resolved.message + ' Tried: ' + resolved.triedPaths.join(', '));
        return;
      }
      setDraft(cloneSpec(resolved.spec));
      setSourceLabel('Resolved from ' + resolved.path);
      setRegistryStatus('Spec ready: ' + resolved.path);
      dispatchProgress({ type: 'scaffold/reset' });
    },
    [github.connected, repoUrl, specsPath],
  );

  const updateDraftField = useCallback(function (
    field: 'variantMatrix' | 'props' | 'bindings',
    jsonText: string,
  ) {
    if (draft === null) {
      return;
    }
    const parsed = validateSpecJsonField(field, jsonText);
    if (!parsed.ok) {
      setValidation(parsed);
      return;
    }
    const next = cloneSpec(draft);
    if (field === 'variantMatrix') {
      next.variantMatrix = parsed.value as ComponentSpecV1['variantMatrix'];
    } else if (field === 'props') {
      next.props = parsed.value as ComponentSpecV1['props'];
    } else {
      next.bindings = parsed.value as ComponentSpecV1['bindings'];
    }
    setDraft(next);
  }, [draft]);

  const canScaffold =
    draft !== null && validation !== null && validation.ok === true && !progressState.running;

  const handleScaffold = useCallback(
    function () {
      if (!canScaffold || draft === null) {
        return;
      }
      dispatchProgress({ type: 'scaffold/start' });
      setShowAudit(false);
      parent.postMessage(
        {
          pluginMessage: {
            type: 'scaffold/run',
            spec: draft,
          },
        },
        '*',
      );
      console.debug('[ui] scaffold/run', { name: draft.name, variantCount: variantCount });
    },
    [canScaffold, draft, variantCount],
  );

  useEffect(function () {
    function readPluginMessage(data: unknown): unknown {
      if (typeof data !== 'object' || data === null || !('pluginMessage' in data)) {
        return undefined;
      }
      return (data).pluginMessage;
    }

    function onMessage(event: MessageEvent) {
      const msg = readPluginMessage(event.data);
      if (isScaffoldProgressMessage(msg)) {
        console.debug('[ui] scaffold/progress', msg.step, msg.status);
        dispatchProgress(msg);
        if (msg.audit !== undefined) {
          setShowAudit(true);
        }
        return;
      }
      if (isScaffoldResultMessage(msg)) {
        dispatchProgress(msg);
        setRegistryKeys(Object.keys(msg.registry.components).sort());
        setShowAudit(true);
        console.debug('[ui] scaffold/result', String(msg.totalDurationMs) + 'ms');
        return;
      }
      if (isScaffoldErrorMessage(msg)) {
        dispatchProgress(msg);
      }
    }

    window.addEventListener('message', onMessage);
    return function () {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const { bannerDoc, dismissBanner, acceptBanner } = useClipboardSources(applyLoadedDocument);

  const completedSteps = countCompletedSteps(progressState.steps);
  const repoDisplay = formatRepoDisplay(repoUrl);
  const showSyncEmptyHint =
    github.connected && registryKeys.length === 0 && registryStatus.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <section style={SECTION_BORDER} aria-label="Paste or load spec">
        <h2 style={SECTION_HEADING}>Paste or load spec</h2>
        <p style={{ color: '#666', fontSize: 10, lineHeight: 1.45, margin: '0 0 8px' }}>
          Fastest way to scaffold your first component. Browse all repo components (multiselect) ships
          in WO-056.
        </p>
        {bannerDoc !== null ? (
          <ClipboardBanner doc={bannerDoc} onLoad={acceptBanner} onDismiss={dismissBanner} />
        ) : null}
        <SourcePasteTextarea onLoad={handleSourceResult} />
        <SourceDropZone onLoad={handleSourceResult} />
        <SourceFilePicker onLoad={handleSourceResult} />
        {ingestError !== null ? (
          <p style={{ color: '#b00020', fontSize: 11, margin: '8px 0 0' }}>{ingestError}</p>
        ) : null}
        {sourceLabel !== null ? (
          <p style={{ color: '#666', fontSize: 10, margin: '8px 0 0' }}>{sourceLabel}</p>
        ) : null}
      </section>

      <section style={SECTION_BORDER} aria-label="Re-scaffold from linked components">
        <h2 style={SECTION_HEADING}>Re-scaffold from linked components</h2>
        <p style={{ color: '#666', fontSize: 10, lineHeight: 1.45, margin: '0 0 8px' }}>
          Reads the canvas snapshot — components already linked between Figma and GitHub. Connect
          your repo in Settings to resolve specs from GitHub.
        </p>
        {!github.connected ? (
          <div style={{ opacity: 0.6, pointerEvents: 'none' }}>
            <p style={{ color: '#666', fontSize: 11, margin: '0 0 8px' }}>
              Connect GitHub in Settings to resolve component specs from your repo.
            </p>
            {onOpenSettings !== undefined ? (
              <button
                type="button"
                onClick={onOpenSettings}
                style={{
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                }}
              >
                Open Settings
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <p style={{ color: '#333', fontSize: 11, margin: '0 0 8px' }}>
              Connected: <strong>{repoDisplay}</strong>
            </p>
            {showSyncEmptyHint ? (
              <p style={{ color: '#666', fontSize: 10, lineHeight: 1.45, margin: '0 0 8px' }}>
                After your first scaffold, linked components appear here for re-scaffold.
              </p>
            ) : null}
            {registryKeys.length > 0 ? (
              <label style={{ display: 'block', fontSize: 11 }}>
                Linked component
                <select
                  value={selectedKey}
                  onChange={function (e) {
                    void handleSelectRegistryKey(e.target.value);
                  }}
                  style={{ boxSizing: 'border-box', fontSize: 11, marginTop: 4, padding: '6px 8px', width: '100%' }}
                >
                  <option value="">Select a linked component…</option>
                  {registryKeys.map(function (key) {
                    return (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    );
                  })}
                </select>
              </label>
            ) : null}
            {registryStatus.length > 0 ? (
              <p
                role="status"
                style={{
                  color: registryStatus.includes('JSON Schema') ? '#b00020' : '#666',
                  fontSize: 10,
                  lineHeight: 1.45,
                  margin: '8px 0 0',
                }}
              >
                {registryStatus}
              </p>
            ) : null}
            {onOpenSettings !== undefined ? (
              <button
                type="button"
                onClick={onOpenSettings}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: 10,
                  marginTop: 6,
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Edit repo connection in Settings
              </button>
            ) : null}
          </>
        )}
      </section>

      <section style={SECTION_BORDER} aria-label="Spec preview">
        <h2 style={SECTION_HEADING}>Preview</h2>
        <SpecPreviewPanel
          draft={draft}
          variantCount={variantCount}
          selectorWarnings={selectorWarnings}
          validation={validation}
          onEditVariantMatrix={function (json) {
            updateDraftField('variantMatrix', json);
          }}
          onEditProps={function (json) {
            updateDraftField('props', json);
          }}
          onEditBindings={function (json) {
            updateDraftField('bindings', json);
          }}
        />
      </section>

      <section aria-label="Scaffold actions">
        <button
          type="button"
          disabled={!canScaffold}
          onClick={handleScaffold}
          style={{
            border: '1px solid #ccc',
            borderRadius: 4,
            cursor: canScaffold ? 'pointer' : 'not-allowed',
            fontSize: 11,
            fontWeight: 600,
            opacity: canScaffold ? 1 : 0.5,
            padding: '6px 14px',
          }}
        >
          Scaffold component
        </button>
        {progressState.error !== null ? (
          <p
            style={{
              border: '1px solid #f5c2c2',
              borderRadius: 4,
              color: '#b00020',
              fontSize: 11,
              marginTop: 8,
              padding: 8,
            }}
          >
            {progressState.failedStep !== null
              ? progressState.failedStep + ': '
              : ''}
            {progressState.error}
          </p>
        ) : null}
      </section>

      {progressState.running || progressState.result !== null || progressState.error !== null ? (
        <section style={SECTION_BORDER} aria-label="Scaffold progress">
          <h2 style={SECTION_HEADING}>Progress</h2>
          <ScaffoldStepList
            steps={progressState.steps}
            failedStep={progressState.failedStep}
          />
          <p style={{ color: '#666', fontSize: 10, margin: '6px 0 0' }}>
            {String(completedSteps)} / {String(progressState.steps.length)} steps
          </p>
        </section>
      ) : null}

      {showAudit && !progressState.running && progressState.audits.length > 0 ? (
        <section aria-label="Component audit">
          <AuditPanel audits={progressState.audits} />
        </section>
      ) : null}
    </div>
  );
}
