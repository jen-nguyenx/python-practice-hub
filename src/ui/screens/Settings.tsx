// Settings (#/settings): appearance, editor, progress, shortcuts, data and about.
import { py, store } from '../../app/services.ts';
import type { Settings as SettingsT } from '../../engine/types.ts';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Icon } from '../components/Icon.tsx';
import { Segmented } from '../components/Segmented.tsx';
import { Switch } from '../components/Switch.tsx';
import { applyTheme } from '../shell/ThemeToggle.tsx';
import { DataSection } from '../shell/settings/DataSection.tsx';
import { SettingRow, SettingsSection } from '../shell/settings/SettingRow.tsx';
import { shortcutSheetOpen, tourOpen } from '../shell/uiState.ts';
import '../shell/settings/settings.css';

const PYODIDE_VERSION = '314.0.7';

const SECTIONS = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'editor', label: 'Editor' },
  { id: 'progress', label: 'Progress' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'data', label: 'Data' },
  { id: 'about', label: 'About' },
];

function jumpTo(id: string) {
  const heading = document.getElementById(`set-${id}-title`);
  if (!heading) return;
  heading.scrollIntoView({ block: 'start' });
  heading.focus({ preventScroll: true });
}

function pythonVersionText() {
  const s = py.status.value;
  switch (s.state) {
    case 'ready':
    case 'running': return `Python ${s.python}`;
    case 'loading': return 'Python is still loading';
    case 'restarting': return 'Python is restarting';
    case 'error': return 'Python failed to load';
    default: return 'Python has not started yet';
  }
}

function setUnlockAll(value: boolean) {
  if (store.settings.value.unlockAll === value) return;
  store.updateSettings({ unlockAll: value });
  try {
    store.append({ type: 'override', what: 'unlockAll', value });
  } catch {
    /* the setting still applies; the report note needs the store */
  }
}

export function Settings() {
  const s = store.settings.value;
  const set = (patch: Partial<SettingsT>) => store.updateSettings(patch);
  const motion: 'system' | 'on' = s.reducedMotion === 'on' ? 'on' : 'system';

  return (
    <div class="page settings-page">
      <header class="screen-head">
        <h1>Settings</h1>
        <p class="muted">Saved in this browser as soon as you change them.</p>
      </header>

      <div class="settings-grid">
        <nav class="set-index" aria-label="Settings sections">
          {SECTIONS.map((sec) => (
            <button key={sec.id} type="button" class="set-index-link" onClick={() => jumpTo(sec.id)}>{sec.label}</button>
          ))}
        </nav>

        <div class="set-sections">
          <SettingsSection id="appearance" title="Appearance">
            <SettingRow id="set-theme" label="Theme" desc="System follows your computer's light or dark setting.">
              <Segmented<SettingsT['theme']>
                labelledBy="set-theme-label"
                value={s.theme}
                onChange={(v) => { set({ theme: v }); applyTheme(v); }}
                options={[
                  { value: 'system', label: <><Icon name="monitor" size={14} />System</> },
                  { value: 'light', label: <><Icon name="sun" size={14} />Light</> },
                  { value: 'dark', label: <><Icon name="moon" size={14} />Dark</> },
                ]}
              />
            </SettingRow>
            <SettingRow id="set-motion" label="Reduce motion" desc="Turns off small animations. Follow system uses your computer's accessibility setting.">
              <Segmented<'system' | 'on'>
                labelledBy="set-motion-label"
                value={motion}
                onChange={(v) => set({ reducedMotion: v })}
                options={[
                  { value: 'system', label: 'Follow system' },
                  { value: 'on', label: 'Always reduce' },
                ]}
              />
            </SettingRow>
          </SettingsSection>

          <SettingsSection id="editor" title="Editor">
            <SettingRow id="set-layout" label="Question layout" stack>
              <fieldset class="radio-cards two">
                <legend class="sr-only">Question layout</legend>
                <label class={`radio-card${s.layout === 'simple' ? ' on' : ''}`}>
                  <input type="radio" name="layout" value="simple" checked={s.layout === 'simple'} onChange={() => set({ layout: 'simple' })} />
                  <span>
                    <span class="radio-card-title">Simple</span>
                    <span class="radio-card-desc">The question, your code and one output panel. Best while you're learning.</span>
                  </span>
                </label>
                <label class={`radio-card${s.layout === 'full' ? ' on' : ''}`}>
                  <input type="radio" name="layout" value="full" checked={s.layout === 'full'} onChange={() => set({ layout: 'full' })} />
                  <span>
                    <span class="radio-card-title">Full</span>
                    <span class="radio-card-desc">Adds a question list, test and problem panels, like VS Code.</span>
                  </span>
                </label>
              </fieldset>
            </SettingRow>
            <SettingRow id="set-font" label="Code font size" desc="Used in the code editor and Playground.">
              <div class="font-size">
                <input
                  type="range"
                  min={12}
                  max={20}
                  step={1}
                  value={s.editorFontSize}
                  aria-labelledby="set-font-label"
                  aria-valuetext={`${s.editorFontSize} pixels`}
                  onInput={(e) => set({ editorFontSize: Number((e.currentTarget as HTMLInputElement).value) })}
                />
                <output class="mono font-size-value" aria-hidden="true">{s.editorFontSize} px</output>
              </div>
            </SettingRow>
            <div class="font-preview" aria-hidden="true" style={{ fontSize: `${s.editorFontSize}px` }}>
              <CodeBlock code={'total = 0\nfor i in range(3):\n    total = total + i * 2\nprint(total)'} />
            </div>
          </SettingsSection>

          <SettingsSection id="progress" title="Progress">
            <SettingRow
              id="set-unlock"
              label="Unlock all topics"
              desc={<>Open every topic without reaching the minimums. <strong>This is noted in your report.</strong></>}
            >
              <Switch checked={s.unlockAll} onChange={setUnlockAll} labelledBy="set-unlock-label" describedBy="set-unlock-desc" />
            </SettingRow>
          </SettingsSection>

          <SettingsSection id="shortcuts" title="Shortcuts">
            <SettingRow
              id="set-single"
              label="Single-key shortcuts"
              desc={<>Use <kbd>]</kbd> <kbd>[</kbd> <kbd>1-5</kbd> and <kbd>?</kbd> when you're not typing in a text field. Turn off if you use voice control or a screen reader that sends single keys.</>}
            >
              <Switch checked={s.singleKeyShortcuts} onChange={(v) => set({ singleKeyShortcuts: v })} labelledBy="set-single-label" describedBy="set-single-desc" />
            </SettingRow>
            <SettingRow id="set-sheet" label="All keyboard shortcuts" desc="Run, Submit, hints and moving between questions.">
              <button type="button" class="btn" onClick={() => { shortcutSheetOpen.value = true; }}>
                <Icon name="keyboard" size={14} />
                Show shortcuts
              </button>
            </SettingRow>
            <SettingRow id="set-tour" label="Welcome tour" desc="The four-step introduction shown on your first visit.">
              <button type="button" class="btn" onClick={() => { tourOpen.value = true; }}>Show the tour</button>
            </SettingRow>
          </SettingsSection>

          <DataSection />

          <SettingsSection id="about" title="About">
            <dl class="about-list">
              <div class="about-row"><dt>Python</dt><dd class="mono" aria-live="polite">{pythonVersionText()}</dd></div>
              <div class="about-row"><dt>Pyodide</dt><dd class="mono">{PYODIDE_VERSION}</dd></div>
              <div class="about-row">
                <dt>Privacy</dt>
                <dd>
                  Your progress stays in this browser on this device. There are no accounts, no analytics and no tracking.
                  The only downloads are Python itself (Pyodide, from jsDelivr) and fonts (Google Fonts).
                </dd>
              </div>
              <div class="about-row">
                <dt>Unit</dt>
                <dd>Not affiliated with UWA. Aligned with public CITS1401 materials; check your LMS for this semester's rules.</dd>
              </div>
            </dl>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
