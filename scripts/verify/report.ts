// Issue collection and the printed report.

export type Level = 'error' | 'warn';

export interface Issue {
  level: Level;
  topicId: string;
  /** Question or scenario id, when the issue belongs to one. */
  where?: string;
  format?: string;
  msg: string;
}

export class Issues {
  readonly list: Issue[] = [];

  error(topicId: string, where: string | undefined, msg: string, format?: string): void {
    this.list.push({ level: 'error', topicId, where, format, msg });
  }

  warn(topicId: string, where: string | undefined, msg: string, format?: string): void {
    this.list.push({ level: 'warn', topicId, where, format, msg });
  }

  count(level: Level, topicId?: string): number {
    return this.list.filter((i) => i.level === level && (topicId === undefined || i.topicId === topicId)).length;
  }

  forTopic(topicId: string): Issue[] {
    return this.list.filter((i) => i.topicId === topicId);
  }
}

/** A scoped reporter for one question (or scenario/topic). */
export interface Scope {
  error(msg: string): void;
  warn(msg: string): void;
}

export function scope(issues: Issues, topicId: string, where?: string, format?: string): Scope {
  return {
    error: (msg) => issues.error(topicId, where, msg, format),
    warn: (msg) => issues.warn(topicId, where, msg, format),
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function formatIssue(i: Issue): string {
  const tag = i.level === 'error' ? 'ERROR' : 'WARN ';
  const where = i.where ? ` ${i.where}` : '';
  const fmt = i.format ? ` [${i.format}]` : '';
  const msg = i.msg.replace(/\n/g, '\n        ');
  return `  ${tag}${where}${fmt}: ${msg}`;
}

export function topicHeader(num: string, id: string, questions: number, stub: boolean, issues: Issues): string {
  const e = issues.count('error', id);
  const w = issues.count('warn', id);
  const status = e > 0 ? 'FAIL' : 'ok  ';
  const body = stub ? 'stub (no scenarios yet)' : plural(questions, 'question');
  return `${status} ${num} ${id}: ${body}, ${plural(e, 'error')}, ${plural(w, 'warning')}`;
}

export { plural };
