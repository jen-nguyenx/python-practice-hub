import type { Topic } from '../../schema.ts';
import { cheatsheet, commonMistakes, workedExample } from './cheatsheet.ts';
import { experiments } from './experiments.ts';
import s1 from './s1-swan-river-salinity.ts';
import s2 from './s2-transperth-patterns.ts';
import s3 from './s3-perth-suburbs.ts';
import s4 from './s4-unit-results.ts';

const topic: Topic = {
  id: 'project-simulator',
  cheatsheet,
  workedExample,
  commonMistakes,
  scenarios: [s1, s2, s3, s4],
  experiments,
};

export default topic;
