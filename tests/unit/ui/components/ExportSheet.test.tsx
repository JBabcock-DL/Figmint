import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExportSheet } from '@/ui/components/ExportSheet';
import * as availableSinksModule from '@/ui/export/availableSinks';
import * as runExportModule from '@/ui/export/runExport';
import {
  ALL_EXPORT_FIXTURES,
  loadDriftReportFixture,
  loadRegistryFixture,
} from '../../../helpers/ui/export/loadExportFixture';

describe('ExportSheet', () => {
  afterEach(function () {
    vi.restoreAllMocks();
  });

  it('renders format and sink fieldsets for drift-report fixture', function () {
    render(<ExportSheet document={loadDriftReportFixture()} defaultSinks={['download']} />);

    expect(screen.getByRole('group', { name: 'Format' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Destinations' })).toBeInTheDocument();
    expect(screen.getByLabelText('JSON')).toBeInTheDocument();
    expect(screen.getByLabelText('Markdown')).toBeInTheDocument();
    expect(screen.getByLabelText('Download file(s)')).toBeInTheDocument();
  });

  it.each(ALL_EXPORT_FIXTURES)('renders without crash for $kind', function (document) {
    render(<ExportSheet document={document} defaultSinks={['download']} />);
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('hides Markdown checkbox for registry fixture', function () {
    render(<ExportSheet document={loadRegistryFixture()} defaultSinks={['download']} />);

    expect(screen.getByLabelText('JSON')).toBeInTheDocument();
    expect(screen.queryByLabelText('Markdown')).not.toBeInTheDocument();
  });

  it('omits github-pr checkbox when GitHub OAuth flag is off', function () {
    vi.spyOn(availableSinksModule, 'availableSinks').mockReturnValue([
      'download',
      'clipboard',
      'output-page',
      'plugin-data',
    ]);

    render(<ExportSheet document={loadDriftReportFixture()} defaultSinks={['download']} />);

    expect(screen.queryByLabelText('Open GitHub PR')).not.toBeInTheDocument();
  });

  it('shows per-sink success and failure in status list after export', async function () {
    const user = userEvent.setup();
    vi.spyOn(runExportModule, 'runExport').mockImplementation(
      async function (_doc, _state, dispatch) {
        dispatch({ type: 'start-export', requestId: 'export-test' });
        dispatch({
          type: 'sink-result',
          sink: 'download',
          ok: true,
          message: 'Saved drift-report.json',
        });
        dispatch({
          type: 'sink-result',
          sink: 'clipboard',
          ok: false,
          error: 'Clipboard unavailable',
        });
        dispatch({ type: 'complete' });
      },
    );

    render(
      <ExportSheet document={loadDriftReportFixture()} defaultSinks={['download', 'clipboard']} />,
    );

    await user.click(screen.getByRole('button', { name: 'Export' }));

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('\u2713');
    expect(status).toHaveTextContent('\u2717');
    expect(status).toHaveTextContent('Saved drift-report.json');
    expect(status).toHaveTextContent('Clipboard unavailable');
  });

  it('disables Export when no format is selected', async function () {
    const user = userEvent.setup();
    render(<ExportSheet document={loadDriftReportFixture()} defaultSinks={['download']} />);

    const exportButton = screen.getByRole('button', { name: 'Export' });
    expect(exportButton).not.toBeDisabled();

    await user.click(screen.getByLabelText('JSON'));
    await user.click(screen.getByLabelText('Markdown'));

    expect(exportButton).toBeDisabled();
  });
});
