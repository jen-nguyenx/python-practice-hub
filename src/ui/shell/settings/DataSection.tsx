// Settings > Data: export, import (merge or replace), keep my data (persistent storage) and reset.
import { useEffect, useRef, useState } from 'preact/hooks';
import { store } from '../../../app/services.ts';
import type { ExportFile } from '../../../store/types.ts';
import { Dialog } from '../../components/Dialog.tsx';
import { Icon } from '../../components/Icon.tsx';
import { checkImport, downloadExport, persistState, requestPersist } from '../backup.ts';
import type { PersistState } from '../backup.ts';
import { plural, relativeDay, shortDate } from '../format.ts';
import { SettingRow, SettingsSection } from './SettingRow.tsx';

type Status = { tone: 'ok' | 'bad' | 'info'; text: string } | null;

function StatusLine({ status }: { status: Status }) {
  return (
    <p class={`set-status${status ? ' ' + status.tone : ''}`} aria-live="polite">
      {status ? (
        <>
          <Icon name={status.tone === 'ok' ? 'check' : status.tone === 'bad' ? 'alert' : 'info'} size={14} />
          {status.text}
        </>
      ) : null}
    </p>
  );
}

function errText(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export function DataSection() {
  const settings = store.settings.value;
  const [exportStatus, setExportStatus] = useState<Status>(null);
  const [exporting, setExporting] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ file: ExportFile; name: string } | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<Status>(null);

  const [persist, setPersist] = useState<PersistState | null>(null);
  const [persistMsg, setPersistMsg] = useState<Status>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<Status>(null);

  useEffect(() => {
    let alive = true;
    persistState().then((s) => { if (alive) setPersist(s); });
    return () => { alive = false; };
  }, []);

  const doExport = async () => {
    setExporting(true);
    setExportStatus(null);
    try {
      const name = await downloadExport();
      setExportStatus({ tone: 'ok', text: `Downloaded ${name}.` });
    } catch (e) {
      setExportStatus({ tone: 'bad', text: `Export failed: ${errText(e)}` });
    } finally {
      setExporting(false);
    }
  };

  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    setImportStatus(null);
    if (f.size > 50 * 1024 * 1024) {
      setImportStatus({ tone: 'bad', text: 'That file is too large to be a PyLadder export.' });
      return;
    }
    let text: string;
    try {
      text = await f.text();
    } catch (err) {
      setImportStatus({ tone: 'bad', text: `Couldn't read the file: ${errText(err)}` });
      return;
    }
    const check = checkImport(text);
    if (!check.ok) {
      setImportStatus({ tone: 'bad', text: check.message });
      return;
    }
    setMode('merge');
    setPending({ file: check.file, name: f.name });
  };

  const doImport = async () => {
    if (!pending) return;
    setImporting(true);
    try {
      const res = await store.importAll(pending.file, mode);
      setPending(null);
      setImportStatus({
        tone: 'ok',
        text: mode === 'replace'
          ? `Replaced your progress with ${pending.name}.`
          : `Merged ${pending.name}. ${res.added === 0 ? 'Nothing new was added.' : `${plural(res.added, 'new record')} added.`}`,
      });
    } catch (e) {
      setPending(null);
      setImportStatus({ tone: 'bad', text: `Import failed: ${errText(e)}` });
    } finally {
      setImporting(false);
    }
  };

  const doPersist = async () => {
    const s = await requestPersist();
    setPersist(s);
    setPersistMsg(
      s === 'granted'
        ? { tone: 'ok', text: 'Done. Your browser will keep PyLadder data unless you clear it yourself.' }
        : s === 'not-granted'
          ? { tone: 'info', text: "Your browser didn't agree this time. It often agrees after you've used the site for a while. Keep exporting backups." }
          : { tone: 'info', text: "This browser can't promise to keep data. Keep exporting backups." },
    );
  };

  const doReset = async () => {
    setResetting(true);
    try {
      await store.resetAll();
      setResetOpen(false);
      setResetText('');
      setResetStatus({ tone: 'ok', text: 'All progress in this browser was deleted.' });
    } catch (e) {
      setResetOpen(false);
      setResetStatus({ tone: 'bad', text: `Reset failed: ${errText(e)}` });
    } finally {
      setResetting(false);
    }
  };

  const events = pending?.file.events.length ?? 0;

  return (
    <SettingsSection id="data" title="Data">
      <SettingRow
        id="set-export"
        label="Export progress"
        desc={
          <>
            Downloads a file with your answers, progress and Playground files. Last backup:{' '}
            <strong>{settings.lastExportTs ? `${relativeDay(settings.lastExportTs)} (${shortDate(settings.lastExportTs)})` : 'never'}</strong>.
            <StatusLine status={exportStatus} />
          </>
        }
      >
        <button type="button" class="btn" onClick={doExport} disabled={exporting} aria-describedby="set-export-desc">
          <Icon name="download" size={14} />
          {exporting ? 'Exporting...' : 'Export progress'}
        </button>
      </SettingRow>

      <SettingRow
        id="set-import"
        label="Import progress"
        desc={<>Load a file you exported, from this or another device. You choose to merge or replace next.<StatusLine status={importStatus} /></>}
      >
        <input ref={fileInput} type="file" accept="application/json,.json" class="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} />
        <button type="button" class="btn" onClick={() => fileInput.current?.click()} aria-describedby="set-import-desc">
          <Icon name="upload" size={14} />
          Import from file...
        </button>
      </SettingRow>

      <SettingRow
        id="set-persist"
        label="Keep my data"
        desc={
          <>
            {persist === 'granted'
              ? 'Your browser has agreed to keep PyLadder data.'
              : "Browsers can clear site data when space runs low. Ask this browser to keep PyLadder's data."}
            <StatusLine status={persistMsg} />
          </>
        }
      >
        <button type="button" class="btn" onClick={doPersist} disabled={persist === 'granted'} aria-describedby="set-persist-desc">
          <Icon name="shield" size={14} />
          {persist === 'granted' ? 'Data is kept' : 'Keep my data'}
        </button>
      </SettingRow>

      <SettingRow
        id="set-reset"
        label="Reset progress"
        desc={<>Deletes all progress, drafts and Playground files in this browser. Export first if you might want them back.<StatusLine status={resetStatus} /></>}
      >
        <button type="button" class="btn danger" onClick={() => { setResetText(''); setResetOpen(true); }} aria-describedby="set-reset-desc">
          <Icon name="trash" size={14} />
          Reset...
        </button>
      </SettingRow>

      <Dialog
        open={!!pending}
        onClose={() => { if (!importing) setPending(null); }}
        title="Import progress"
        description={pending ? `${pending.name} · exported ${shortDate(pending.file.exportedAt)} · ${plural(events, 'record')}` : undefined}
        footer={
          <>
            <button type="button" class="btn" onClick={() => setPending(null)} disabled={importing}>Cancel</button>
            {mode === 'merge' ? (
              <button type="button" class="btn primary" onClick={doImport} disabled={importing}>{importing ? 'Importing...' : 'Merge into my progress'}</button>
            ) : (
              <button type="button" class="btn danger" onClick={doImport} disabled={importing}>{importing ? 'Importing...' : 'Replace my progress'}</button>
            )}
          </>
        }
      >
        <fieldset class="radio-cards">
          <legend class="sr-only">How to import</legend>
          <label class={`radio-card${mode === 'merge' ? ' on' : ''}`}>
            <input type="radio" name="import-mode" value="merge" checked={mode === 'merge'} onChange={() => setMode('merge')} />
            <span>
              <span class="radio-card-title">Merge</span>
              <span class="radio-card-desc">Add the file's progress to what's already here. Nothing is deleted.</span>
            </span>
          </label>
          <label class={`radio-card${mode === 'replace' ? ' on' : ''}`}>
            <input type="radio" name="import-mode" value="replace" checked={mode === 'replace'} onChange={() => setMode('replace')} />
            <span>
              <span class="radio-card-title">Replace</span>
              <span class="radio-card-desc">Delete the progress in this browser and use only the file. This can't be undone.</span>
            </span>
          </label>
        </fieldset>
      </Dialog>

      <Dialog
        open={resetOpen}
        onClose={() => { if (!resetting) setResetOpen(false); }}
        size="sm"
        dismissOnBackdrop={false}
        title="Reset all progress?"
        description="This deletes every answer, hint, test result, draft and Playground file in this browser. It can't be undone."
        initialFocus="#reset-confirm"
        footer={
          <>
            <button type="button" class="btn" onClick={() => setResetOpen(false)} disabled={resetting}>Cancel</button>
            <button type="button" class="btn danger" onClick={doReset} disabled={resetText !== 'RESET' || resetting}>
              {resetting ? 'Deleting...' : 'Delete everything'}
            </button>
          </>
        }
      >
        <form class="field" onSubmit={(e) => { e.preventDefault(); if (resetText === 'RESET') void doReset(); }}>
          <label class="field-label" for="reset-confirm">Type <kbd>RESET</kbd> to confirm</label>
          <input
            id="reset-confirm"
            class="input mono"
            value={resetText}
            onInput={(e) => setResetText((e.currentTarget as HTMLInputElement).value)}
            autocomplete="off"
            autocapitalize="characters"
            spellcheck={false}
          />
        </form>
      </Dialog>
    </SettingsSection>
  );
}
