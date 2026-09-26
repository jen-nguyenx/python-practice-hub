// Which unit is in force, and what each unit is offered. The rule has to hold both ways: a CITS1401
// student is never handed R, and a STAT2402 student never has to wade through the Python ladder.
import { describe, expect, it } from 'vitest';
import { isLessonVisible, isTrackVisible, LESSON_INDEX, visibleTracks } from './lessons/index.ts';
import { TRACK_LANG, TRACKS } from './lessonSchema.ts';
import { unitOf, UNITS } from './units.ts';
import { sanitizeSettings, settingsFrom } from '../store/validate.ts';
import { tokenize } from '../ui/components/highlight.ts';
import { installOrder, packagesUsed, R_PACKAGES } from '../runtime/r/packages.ts';

describe('unitOf', () => {
  it('treats a student who has not chosen as CITS1401, the app as it was', () => {
    expect(unitOf({ unit: null })).toBe('cits1401');
    expect(unitOf({})).toBe('cits1401');
    expect(unitOf({ unit: 'stat2402' })).toBe('stat2402');
  });

  it('has a unit for each language the tracks are taught in', () => {
    expect(new Set(Object.values(UNITS).map((u) => u.lang))).toEqual(new Set(Object.values(TRACK_LANG)));
  });
});

describe('visibleTracks', () => {
  it('gives CITS1401 its three Python tracks and nothing in R', () => {
    expect(visibleTracks({ unit: 'cits1401' })).toEqual(['foundations', 'core', 'advanced']);
    expect(visibleTracks({ unit: null })).toEqual(['foundations', 'core', 'advanced']);
  });

  it('gives STAT2402 its own track and nothing in Python', () => {
    expect(visibleTracks({ unit: 'stat2402' })).toEqual(['stat2402']);
  });

  it('adds Markets for either unit only when its switch is on', () => {
    expect(visibleTracks({ unit: 'cits1401', showMarkets: true })).toContain('markets');
    expect(visibleTracks({ unit: 'stat2402', showMarkets: true })).toEqual(['markets', 'stat2402']);
    expect(isTrackVisible('markets', { unit: 'stat2402' })).toBe(false);
  });

  it('offers every track to someone, so no lesson is unreachable from the library', () => {
    const reachable = new Set([
      ...visibleTracks({ unit: 'cits1401', showMarkets: true }),
      ...visibleTracks({ unit: 'stat2402', showMarkets: true }),
    ]);
    expect([...reachable].sort()).toEqual([...TRACKS].sort());
  });

  it('keeps every STAT2402 lesson in R and away from a CITS1401 student', () => {
    const stat = LESSON_INDEX.filter((l) => l.track === 'stat2402');
    expect(stat.length).toBeGreaterThan(0);
    for (const l of stat) {
      expect(TRACK_LANG[l.track]).toBe('r');
      expect(isLessonVisible(l, { unit: 'cits1401', showMarkets: true })).toBe(false);
      expect(isLessonVisible(l, { unit: 'stat2402' })).toBe(true);
    }
  });
});

describe('settings', () => {
  it('starts with no unit chosen, so the home page asks', () => {
    expect(settingsFrom({}).unit).toBeNull();
  });

  it('keeps a real unit from an imported file and drops anything else', () => {
    expect(sanitizeSettings({ unit: 'stat2402' }).unit).toBe('stat2402');
    expect(sanitizeSettings({ unit: null }).unit).toBeNull();
    expect('unit' in sanitizeSettings({ unit: 'MATH1011' })).toBe(false);
    expect('unit' in sanitizeSettings({ unit: { toString: 'stat2402' } })).toBe(false);
  });
});

describe('R highlighting', () => {
  const kinds = (code: string) => tokenize(code, 'r').filter((t) => t.t !== 'p').map((t) => `${t.t}:${t.v}`);

  it('knows R keywords, strings, numbers, comments and the model-fitting calls', () => {
    // `family = poisson` names the family without calling it, so only the call is coloured.
    expect(kinds('fit <- glm(y ~ x, family = poisson) # counts')).toEqual(['b:glm', 'c:# counts']);
    expect(kinds('exp(coef(fit))')).toEqual(['b:exp', 'b:coef']);
    expect(kinds('if (TRUE) "yes" else 2L')).toEqual(['k:if', 'k:TRUE', 's:"yes"', 'k:else', 'n:2L']);
  });

  it('reads a dotted name as one name, and never a $ part as a call', () => {
    expect(kinds('df.residual(fit)')).toEqual(['b:df.residual']);
    expect(kinds('fit$coefficients(1)')).toEqual(['n:1']);
  });

  it('leaves Python highlighting as it was', () => {
    expect(tokenize('def f(): return None').filter((t) => t.t === 'k').map((t) => t.v)).toEqual(['def', 'return', 'None']);
  });
});

describe('R packages', () => {
  it('finds the packages code asks for, in every way R lets it ask', () => {
    expect(packagesUsed('library(MASS)')).toEqual(['MASS']);
    expect(packagesUsed('require("pscl")', 'fit <- survival::survreg(x)')).toEqual(['pscl', 'survival']);
    expect(packagesUsed('MASS:::glm.nb')).toEqual(['MASS']);
  });

  it('ignores comments and packages that are not pinned', () => {
    expect(packagesUsed('# library(MASS)\nlibrary(dplyr)')).toEqual([]);
  });

  it('installs every dependency before the package that needs it', () => {
    const order = installOrder(['survival', 'pscl']).map((p) => p.name);
    for (const [i, name] of order.entries()) {
      for (const dep of R_PACKAGES[name].deps) expect(order.indexOf(dep)).toBeLessThan(i);
    }
    expect(order).toContain('MASS');
  });

  it('pins every dependency it names', () => {
    for (const p of Object.values(R_PACKAGES)) for (const dep of p.deps) expect(R_PACKAGES[dep]).toBeDefined();
  });
});
