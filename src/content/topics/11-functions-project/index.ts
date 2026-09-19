import type { Topic } from '../../schema.ts';
import { cheatsheet, commonMistakes, workedExample } from './cheatsheet.ts';
import { experiments } from './experiments.ts';
import s1 from './s1-smartrider-scope.ts';
import s2 from './s2-fremantle-markets-defaults.ts';
import s3 from './s3-scorchers-helpers.ts';
import s4 from './s4-bom-rainfall-main.ts';
import s5 from './s5-reid-library-loans.ts';

const topic: Topic = {
  id: 'functions-project',
  cheatsheet,
  workedExample,
  commonMistakes,
  scenarios: [s1, s2, s3, s4, s5],
  experiments,
};

export default topic;
