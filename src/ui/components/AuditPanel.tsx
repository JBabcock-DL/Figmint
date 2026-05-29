import { useMemo, useState } from 'react';

import type { AuditReportV1 } from '@detroitlabs/fighub-contracts';

import {
  classifyAuditRule,
  mergeAuditReports,
  sortAuditRules,
} from '@/ui/components/auditPanelUtils';

interface AuditPanelProps {
  audits: AuditReportV1[];
  onDismiss?: () => void;
}

export function AuditPanel({ audits, onDismiss }: AuditPanelProps) {
  const [showPassed, setShowPassed] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const report = useMemo(
    function () {
      return mergeAuditReports(audits);
    },
    [audits],
  );

  const sortedRules = useMemo(
    function () {
      if (report === null) {
        return [];
      }
      return sortAuditRules(report.results);
    },
    [report],
  );

  const visibleRules = useMemo(
    function () {
      return sortedRules.filter(function (rule) {
        if (showPassed) {
          return true;
        }
        return classifyAuditRule(rule) !== 'passed';
      });
    },
    [showPassed, sortedRules],
  );

  if (report === null) {
    return null;
  }

  const bannerColor = report.passed ? '#e6f4ea' : '#fdecea';
  const bannerText = report.passed ? '#0a6b0a' : '#b00020';

  function handleCopyJson() {
    const json = JSON.stringify(report, null, 2);
    const textarea = document.createElement('textarea');
    textarea.value = json;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      // Plan spec: textarea + execCommand for plugin iframe clipboard compatibility.

      document.execCommand('copy');
      setCopyStatus('Copied');
    } catch {
      setCopyStatus('Copy failed');
    }
    document.body.removeChild(textarea);
    window.setTimeout(function () {
      setCopyStatus(null);
    }, 2000);
  }

  return (
    <section
      aria-label="Audit results"
      style={{
        border: '1px solid #ddd',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '11px',
        gap: '8px',
        maxHeight: '220px',
        overflow: 'auto',
        padding: '10px',
      }}
    >
      <div
        role="status"
        style={{
          background: bannerColor,
          borderRadius: '4px',
          color: bannerText,
          fontWeight: 600,
          padding: '6px 8px',
        }}
      >
        {report.passed ? 'Audit passed' : 'Audit failed'} · {String(report.summary.rulesPassed)}{' '}
        passed · {String(report.summary.rulesFailed)} failed · {String(report.summary.rulesWarned)}{' '}
        warned
      </div>

      {report.meta.operation === 'push-variables' ? (
        <p style={{ color: '#444', margin: 0 }}>
          Push stats: created {String(report.summary.variablesCreated)}, updated{' '}
          {String(report.summary.variablesUpdated)}, skipped{' '}
          {String(report.summary.variablesSkipped)}
        </p>
      ) : null}

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {visibleRules.map(function (rule) {
          const bucket = classifyAuditRule(rule);
          const color = bucket === 'failed' ? '#b00020' : bucket === 'warn' ? '#8a6d00' : '#0a6b0a';
          return (
            <li
              key={rule.ruleId + rule.diagnostic}
              style={{
                borderBottom: '1px solid #eee',
                color: color,
                padding: '4px 0',
              }}
            >
              <span style={{ fontWeight: 600 }}>{rule.ruleId}</span>
              <pre
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '10px',
                  margin: '2px 0 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {rule.diagnostic}
              </pre>
            </li>
          );
        })}
      </ul>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <button
          type="button"
          onClick={handleCopyJson}
          style={{ fontSize: '11px', padding: '4px 8px' }}
        >
          Copy JSON
        </button>
        {copyStatus ? <span style={{ color: '#0a6b0a' }}>{copyStatus}</span> : null}
        <button
          type="button"
          onClick={function () {
            setShowPassed(function (prev) {
              return !prev;
            });
          }}
          style={{ fontSize: '11px', padding: '4px 8px' }}
        >
          {showPassed ? 'Hide passed rules' : 'Show passed rules'}
        </button>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </section>
  );
}
