// Settings (#/settings): an editor-style list. Left: section index (sticky, tracks scroll). Right: one white card per section.
import { useEffect, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { py, store } from '../../app/services.ts';
import type { Settings as SettingsT } from '../../engine/types.ts';
import { LinkButton } from '../components/Button.tsx';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Icon } from '../components/Icon.tsx';
import { Segmented } from '../components/Segmented.tsx';
import { Switch } from '../components/Switch.tsx';
import { applyAccent, applyTheme } from '../shell/ThemeToggle.tsx';
import { DataSection } from '../shell/settings/DataSection.tsx';
import { SettingRow, SettingsSection } from '../shell/settings/SettingRow.tsx';
import { shortcutSheetOpen, tourOpen } from '../shell/uiState.ts';
import '../shell/settings/settings.css';

const ACCENT_OPTIONS: { id: SettingsT['accent']; label: string }[] = [
  { id: 'blue-gold', label: 'Blue + Gold' },
  { id: 'mono', label: 'Mono' },
  { id: 'navy-coral', label: 'Navy + Coral' },
  { id: 'ink-tangerine', label: 'Ink + Tangerine' },
];

const PYODIDE_VERSION = '314.0.7';

const SECTIONS = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'editor', label: 'Editor' },
  { id: 'progress', label: 'Progress' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'data', label: 'Data' },
  { id: 'about', label: 'About' },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

function scroller(): HTMLElement | null {
  return document.getElementById('main');
}

function prefersReducedMotion() {
  return document.documentElement.getAttribute('data-motion') === 'reduce'
    || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function jumpTo(id: string) {
  const heading = document.getElementById(`set-${id}-title`);
  if (!heading) return;
  // scrollIntoView() scrolls EVERY ancestor scroller, including the document, which drags the app frame
  // (title bar, icon rail, status bar) out of place. Scroll only the main pane instead.
  const main = scroller();
  if (main) {
    const top = main.scrollTop + heading.getBoundingClientRect().top - main.getBoundingClientRect().top - 16;
    main.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
  heading.focus({ preventScroll: true });
}

/** The section whose heading most recently passed the top of the scroll area. */
function useActiveSection(): [SectionId, (id: SectionId) => void] {
  const [active, setActive] = useState<SectionId>('appearance');
  useEffect(() => {
    const main = scroller();
    if (!main) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const top = main.getBoundingClientRect().top + 96;
      let current: SectionId = SECTIONS[0].id;
      for (const sec of SECTIONS) {
        const el = document.getElementById(`set-${sec.id}`);
        if (el && el.getBoundingClientRect().top <= top) current = sec.id;
      }
      if (main.scrollTop + main.clientHeight >= main.scrollHeight - 4) current = SECTIONS[SECTIONS.length - 1].id;
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    main.addEventListener('scroll', onScroll, { passive: true });
    measure();
    return () => { main.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return [active, setActive];
}

function pythonVersionText() {
  const s = py.status.value;
  switch (s.state) {
    case 'ready':
    case 'running': return `Python ${s.python}`;
    case 'loading': return 'Still loading';
    case 'restarting': return 'Restarting';
    case 'error': return 'Failed to load';
    default: return 'Not started yet';
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
  const [active, setActive] = useActiveSection();

  return (
    <div class="page settings-page">
      <header class="set-head">
        <h1>Settings</h1>
        <p class="set-lede">Saved in this browser as soon as you change them.</p>
      </header>

      <div class="settings-grid">
        <nav class="set-index" aria-label="Settings sections">
          <ul>
            {SECTIONS.map((sec) => (
              <li key={sec.id}>
                <button
                  type="button"
                  class={`set-index-link${active === sec.id ? ' is-current' : ''}`}
                  aria-current={active === sec.id ? 'true' : undefined}
                  onClick={() => { setActive(sec.id); jumpTo(sec.id); }}
                >
                  {sec.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div class="set-sections">
          <SettingsSection id="appearance" title="Appearance">
            <SettingRow id="set-theme" label="Theme" desc="System follows your computer's light or dark setting.">
              <Segmented<SettingsT['theme']>
                labelledBy="set-theme-label"
                value={s.theme}
                onChange={(v) => { set({ theme: v }); applyTheme(v); }}
                options={[
                  { value: 'light', label: <><Icon name="sun" size={14} />Light</> },
                  { value: 'dark', label: <><Icon name="moon" size={14} />Dark</> },
                  { value: 'system', label: <><Icon name="monitor" size={14} />System</> },
                ]}
              />
            </SettingRow>
            <SettingRow id="set-accent" label="Accent colours" desc="Buttons use the first colour; progress bars and markers use the second.">
              <div class="accent-picker" role="radiogroup" aria-labelledby="set-accent-label">
                {ACCENT_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={s.accent === o.id}
                    class={`accent-opt${s.accent === o.id ? ' is-on' : ''}`}
                    data-preview={o.id}
                    onClick={() => { set({ accent: o.id }); applyAccent(o.id); }}
                  >
                    <span class="accent-swatch" aria-hidden="true"><i class="a1" /><i class="a2" /></span>
                    <span class="accent-name">{o.label}</span>
                  </button>
                ))}
              </div>
            </SettingRow>
            <SettingRow id="set-motion" label="Reduce motion" desc="Always turn off small animations. Off follows your computer.">
              <Switch
                checked={s.reducedMotion === 'on'}
                onChange={(v) => set({ reducedMotion: v ? 'on' : 'system' })}
                labelledBy="set-motion-label"
                describedBy="set-motion-desc"
              />
            </SettingRow>
          </SettingsSection>

          <SettingsSection id="editor" title="Editor">
            {/* The old simple/full question layout setting no longer changes anything (every question page uses one layout), so it is not shown. */}
            <SettingRow id="set-font" label="Code font size" desc="Used in the code editor and the Playground." class="font-row">
              <div class="font-size">
                <input
                  type="range"
                  min={12}
                  max={20}
                  step={1}
                  value={s.editorFontSize}
                  aria-labelledby="set-font-label"
                  aria-describedby="set-font-desc"
                  aria-valuetext={`${s.editorFontSize} pixels`}
                  onInput={(e) => set({ editorFontSize: Number((e.currentTarget as HTMLInputElement).value) })}
                />
                <output class="font-size-value" aria-hidden="true">{s.editorFontSize}px</output>
              </div>
            </SettingRow>
            <div class="font-preview" aria-hidden="true" style={{ fontSize: `${s.editorFontSize}px` }}>
              <CodeBlock code={'for i in range(3):\n    print(i * 2)'} />
            </div>
          </SettingsSection>

          <SettingsSection id="progress" title="Progress">
            <SettingRow
              id="set-placement"
              label="Where should you start?"
              desc="Answer one question per topic to open the ones you can already do. Better than the switch below: it opens what you have shown, and leaves the report with nothing to explain away."
            >
              <LinkButton href={href.placement()} variant="secondary" aria-describedby="set-placement-desc">
                <Icon name="ladder" size={14} />
                Take the check
              </LinkButton>
            </SettingRow>
            <SettingRow
              id="set-unlock"
              label="Unlock all topics"
              desc="Open every topic without the minimums. Your report shows this is on."
            >
              <Switch checked={s.unlockAll} onChange={setUnlockAll} labelledBy="set-unlock-label" describedBy="set-unlock-desc" />
            </SettingRow>
            <SettingRow
              id="set-confidence"
              label="Ask how sure I am"
              desc="Before the first check, a question asks whether you are sure. Your report then compares what you said with what happened."
            >
              <Switch checked={s.askConfidence} onChange={(v) => set({ askConfidence: v })} labelledBy="set-confidence-label" describedBy="set-confidence-desc" />
            </SettingRow>
            <SettingRow id="set-tour" label="Welcome tour" desc="The short introduction from your first visit.">
              <button type="button" class="btn sm" onClick={() => { tourOpen.value = true; }} aria-describedby="set-tour-desc">Show the tour again</button>
            </SettingRow>
          </SettingsSection>

          <SettingsSection id="shortcuts" title="Shortcuts">
            <SettingRow
              id="set-single"
              label="Single-key shortcuts"
              desc={<>Use <kbd>]</kbd> <kbd>[</kbd> <kbd>1-5</kbd> <kbd>?</kbd> outside text fields. Turn off for voice control.</>}
            >
              <Switch checked={s.singleKeyShortcuts} onChange={(v) => set({ singleKeyShortcuts: v })} labelledBy="set-single-label" describedBy="set-single-desc" />
            </SettingRow>
            <SettingRow id="set-sheet" label="All keyboard shortcuts" desc="Run, Submit, hints and moving between questions.">
              <button type="button" class="btn link set-link" onClick={() => { shortcutSheetOpen.value = true; }} aria-describedby="set-sheet-desc">
                <Icon name="keyboard" size={16} />
                Open shortcut sheet
              </button>
            </SettingRow>
          </SettingsSection>

          <DataSection />

          <SettingsSection id="about" title="About">
            <SettingRow id="set-python" label="Python" desc="Runs in your browser with Pyodide.">
              <span class="set-value" aria-live="polite">{pythonVersionText()}</span>
            </SettingRow>
            <SettingRow id="set-pyodide" label="Pyodide">
              <span class="set-value">{PYODIDE_VERSION}</span>
            </SettingRow>
            <SettingRow
              id="set-privacy"
              label="Privacy"
              desc="Your progress stays in this browser. No accounts, no tracking. Only Python and fonts are downloaded."
            />
            <SettingRow
              id="set-unit"
              label="Not affiliated with UWA"
              desc="Aligned with public CITS1401 materials. Check your LMS for this semester's rules."
            />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
