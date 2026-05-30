import { useCallback, useMemo, useState } from 'react';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { flags } from '@/config/flags';
import { deriveComponentsRoot } from '@/core/import/shared/deriveComponentsRoot';
import {
  DependencyTreePanel,
  treeHasBlockingUnknowns,
} from '@/ui/components/import/DependencyTreePanel';
import { FileBrowserList } from '@/ui/components/import/FileBrowserList';
import {
  FrameworkPicker,
  type ImportFramework,
} from '@/ui/components/codeconnect/FrameworkPicker';
import type { UseGitHubConnectResult } from '@/ui/github/useGitHubConnect';
import { useImportListFiles } from '@/ui/hooks/useImportListFiles';
import { useImportParse } from '@/ui/hooks/useImportParse';

export interface ImportFromRepoSectionProps {
  repoUrl: string;
  github: UseGitHubConnectResult;
  specsPath?: string;
  onSpecReady: (spec: ComponentSpecV1, meta: { sourcePath: string }) => void;
  onOpenSettings?: () => void;
  sectionBorder: React.CSSProperties;
  sectionHeading: React.CSSProperties;
}

export function ImportFromRepoSection(props: ImportFromRepoSectionProps) {
  const [framework, setFramework] = useState<ImportFramework>('react');
  const [selectedPath, setSelectedPath] = useState('');
  const [resolvedUnknowns, setResolvedUnknowns] = useState<Record<string, boolean>>({});

  const rootPath = useMemo(
    function () {
      return deriveComponentsRoot(props.specsPath);
    },
    [props.specsPath],
  );

  const { state: listState, refresh: refreshFiles } = useImportListFiles(props.repoUrl);
  const { state: parseState, parse: runParse, reset: resetParse } = useImportParse();

  const handleResolveUnknown = useCallback(function (
    nodeName: string,
    action: 'import-first' | 'placeholder' | 'cancel',
  ) {
    if (action === 'cancel') {
      setResolvedUnknowns(function (prev) {
        const next = { ...prev };
        delete next[nodeName];
        return next;
      });
      return;
    }
    setResolvedUnknowns(function (prev) {
      const next = { ...prev };
      next[nodeName] = true;
      return next;
    });
  }, []);

  const blockingUnknowns = treeHasBlockingUnknowns(parseState.dependencyTree, resolvedUnknowns);
  const canUsePreview =
    parseState.spec !== null && !parseState.parsing && !blockingUnknowns && !parseState.error;

  if (!flags.componentImport) {
    return null;
  }

  return (
    <section style={props.sectionBorder} aria-label="Import from repo">
      <h2 style={props.sectionHeading}>Import from repo</h2>
      <p style={{ color: '#666', fontSize: 10, lineHeight: 1.45, margin: '0 0 8px' }}>
        Pick a React `.tsx` file from your connected repo. Edit the preview before scaffolding.
      </p>

      <FrameworkPicker value={framework} onChange={setFramework} />

      {!props.github.connected ? (
        <div style={{ opacity: 0.6, pointerEvents: 'none' }}>
          <p style={{ color: '#666', fontSize: 11, margin: '0 0 8px' }}>
            Connect GitHub in Settings to browse repository files.
          </p>
          {props.onOpenSettings !== undefined ? (
            <button
              type="button"
              onClick={props.onOpenSettings}
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
          <button
            type="button"
            disabled={listState.loading || framework !== 'react'}
            onClick={function () {
              refreshFiles(rootPath);
            }}
            style={{
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 8,
              padding: '4px 10px',
            }}
          >
            {listState.loading ? 'Refreshing…' : 'Refresh file list'}
          </button>

          {listState.error.length > 0 ? (
            <p role="alert" style={{ color: '#b00020', fontSize: 11, margin: '0 0 8px' }}>
              {listState.error}
            </p>
          ) : null}

          <FileBrowserList
            files={listState.files}
            rootPath={rootPath}
            selectedPath={selectedPath}
            onSelect={function (path) {
              setSelectedPath(path);
              resetParse();
              setResolvedUnknowns({});
            }}
          />

          <button
            type="button"
            disabled={selectedPath.length === 0 || parseState.parsing || framework !== 'react'}
            aria-busy={parseState.parsing}
            onClick={function () {
              runParse({ repoUrl: props.repoUrl, sourcePath: selectedPath });
              setResolvedUnknowns({});
            }}
            style={{
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              marginTop: 8,
              padding: '4px 10px',
            }}
          >
            {parseState.parsing ? 'Parsing…' : 'Parse component'}
          </button>

          {parseState.error.length > 0 ? (
            <p role="alert" style={{ color: '#b00020', fontSize: 11, margin: '8px 0 0' }}>
              {parseState.error}
            </p>
          ) : null}

          <DependencyTreePanel
            tree={parseState.dependencyTree}
            resolvedUnknowns={resolvedUnknowns}
            onResolveUnknown={handleResolveUnknown}
          />

          <button
            type="button"
            disabled={!canUsePreview}
            onClick={function () {
              if (parseState.spec === null) {
                return;
              }
              props.onSpecReady(parseState.spec, { sourcePath: selectedPath });
            }}
            style={{
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              marginTop: 8,
              opacity: canUsePreview ? 1 : 0.5,
              padding: '4px 10px',
            }}
          >
            Use in preview
          </button>
        </>
      )}
    </section>
  );
}
