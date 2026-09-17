import type { Topic } from '../../schema.ts';
import { cheatsheet, commonMistakes, workedExample } from './cheatsheet.ts';
import s1 from './s1-smartrider-fares.ts';
import s2 from './s2-unit-marks.ts';
import s3 from './s3-rottnest-quokkas.ts';
import s4 from './s4-scorchers-stats.ts';

const topic: Topic = {
  id: 'functions-basics',
  cheatsheet,
  workedExample,
  commonMistakes,
  scenarios: [s1, s2, s3, s4],
};

export default topic;
