// The first thing a new student sees (#/ while settings.unit is null): which unit are you here for?
// Two large choices, one tap each. The answer is a setting, so it can be changed in Settings at any time,
// and nothing else in the app asks it again.
import { store } from '../../../app/services.ts';
import type { UnitId } from '../../../content/units.ts';
import { UNIT_IDS, UNITS } from '../../../content/units.ts';
import { Icon } from '../../components/Icon.tsx';
import { LANG_NAME } from '../../components/codeLang.ts';

export function chooseUnit(unit: UnitId) {
  store.updateSettings({ unit });
}

export function UnitChooser() {
  return (
    <div class="page home unit-pick">
      <header class="up-head">
        <p class="home-eyebrow">Welcome to PyLadder</p>
        <h1 class="up-title">Which unit are you studying?</h1>
        <p class="up-lede">Each unit has its own path through the app. You can switch at any time in Settings.</p>
      </header>
      <ul class="up-grid">
        {UNIT_IDS.map((id) => {
          const u = UNITS[id];
          return (
            <li key={id} class="up-cell">
              <button type="button" class="up-card" onClick={() => chooseUnit(id)} aria-describedby={`up-blurb-${id}`}>
                <span class="up-code num">{u.code}</span>
                <span class="up-name">{u.name}</span>
                <span class="up-blurb" id={`up-blurb-${id}`}>{u.blurb}</span>
                <span class="up-foot">
                  <span class="up-lang">In {LANG_NAME[u.lang]}</span>
                  <span class="up-go">Start <Icon name="arrowRight" size={16} /></span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p class="up-note">Both run their code right here in your browser. Nothing you write is sent anywhere.</p>
    </div>
  );
}
