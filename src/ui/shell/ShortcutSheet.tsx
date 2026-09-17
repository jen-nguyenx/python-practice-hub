// Keyboard shortcut sheet dialog. Opened with "?" (outside text fields) or the header keyboard button.
import { href } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { Dialog } from '../components/Dialog.tsx';
import { SHORTCUT_GROUPS } from './shortcuts.ts';
import type { ShortcutRow } from './shortcuts.ts';
import { shortcutSheetOpen } from './uiState.ts';

function Keys({ row }: { row: ShortcutRow }) {
  return (
    <span class="sc-keys">
      {row.keys.map((combo, i) => (
        <span key={i} class="sc-combo">
          {i > 0 ? <span class="sc-then">{row.sequence ? 'then' : 'or'}</span> : null}
          {combo.map((k, j) => (
            <span key={j} class="sc-key">
              {j > 0 ? <span class="sc-plus" aria-hidden="true">+</span> : null}
              <kbd>{k}</kbd>
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

export function ShortcutSheet() {
  const open = shortcutSheetOpen.value;
  const singleKey = store.settings.value.singleKeyShortcuts;
  const close = () => { shortcutSheetOpen.value = false; };
  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      title="Keyboard shortcuts"
      description="Every shortcut also has a button on screen."
      footer={<button type="button" class="btn" onClick={close}>Close</button>}
    >
      {!singleKey ? (
        <p class="sc-note">
          Single-key shortcuts are turned off, so the rows marked "Off" do nothing.{' '}
          <a href={href.settings()} onClick={close}>Change this in Settings</a>.
        </p>
      ) : null}
      <div class="sc-groups">
        {SHORTCUT_GROUPS.map((g) => (
          <section key={g.title} class="sc-group" aria-label={g.title}>
            <h3 class="label">{g.title}</h3>
            <table class="sc-table">
              <thead class="sr-only">
                <tr><th scope="col">Action</th><th scope="col">Keys</th><th scope="col">Where</th></tr>
              </thead>
              <tbody>
                {g.rows.map((r, i) => {
                  const off = r.singleKey && !singleKey;
                  return (
                    <tr key={i} class={off ? 'is-off' : undefined}>
                      <td class="sc-action">{r.action}</td>
                      <td><Keys row={r} /></td>
                      <td class="sc-where">{off ? 'Off' : r.where}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
