// Which unit is in force, in the title bar on every page, one click from the other one. The choice used to
// live only in Settings, and a student who had picked STAT2402 found no way back to Python from anything
// the STAT2402 bar offers.
//
// Switching keeps everything: both units write to one event log. The page stays put when the other unit has
// the same page (routeSurvivesUnitSwitch); anything else lands on the other unit's home.
import type { Route } from '../../app/router.ts';
import { href, navigate, routeSurvivesUnitSwitch } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import type { UnitId } from '../../content/units.ts';
import { UNIT_IDS, UNITS, unitOf } from '../../content/units.ts';
import { Segmented } from '../components/Segmented.tsx';

export function switchUnitTo(unit: UnitId, r: Route): void {
  if (unitOf(store.settings.value) === unit) return;
  store.updateSettings({ unit });
  if (!routeSurvivesUnitSwitch(r)) navigate(href.landing());
}

const LANG_WORD = { python: 'Python', r: 'R' } as const;

export function UnitSwitch({ route }: { route: Route }) {
  return (
    <Segmented<UnitId>
      class="tb-unit"
      size="sm"
      label="Your unit"
      value={unitOf(store.settings.value)}
      onChange={(u) => switchUnitTo(u, route)}
      options={UNIT_IDS.map((id) => ({
        value: id,
        title: `${UNITS[id].code}: ${UNITS[id].name}, in ${LANG_WORD[UNITS[id].lang]}`,
        // The code on a wide screen, the language on a phone, where two unit codes do not fit beside the logo.
        label: <><span class="tb-unit-code">{UNITS[id].code}</span><span class="tb-unit-lang">{LANG_WORD[UNITS[id].lang]}</span></>,
      }))}
    />
  );
}
