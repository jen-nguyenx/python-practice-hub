import type { Topic } from '../../schema.ts';
import { cheatsheet, commonMistakes, workedExample } from './cheatsheet.ts';
import s1 from './s1-swan-river-sensors.ts';
import s2 from './s2-smartrider-exports.ts';
import s3 from './s3-oday-signups.ts';

const topic: Topic = {
  id: 'files-csv',
  cheatsheet,
  workedExample,
  commonMistakes,
  scenarios: [s1, s2, s3],
};

export default topic;
