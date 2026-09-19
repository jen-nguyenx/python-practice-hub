// Lesson content schema. Lessons live under src/content/lessons/** and are authored teaching material,
// unlike questions (practice) and experiments (exploration).
//
// The rule that governs everything here: a lesson never states what Python does. Every output shown to a
// student is produced by running the code in real Python at verify time, exactly like the read-format
// answers. If a lesson claims `int(3.7)` is 3, that 3 came from the interpreter.
import type { MistakeId, TopicId } from './ids.ts';
import type { Experiment, GeneratedExperiment, Md } from './schema.ts';

/** Where a lesson sits in the library. */
export type Track = 'foundations' | 'core' | 'advanced';

export const TRACKS: readonly Track[] = ['foundations', 'core', 'advanced'];

export const TRACK_LABEL: Record<Track, string> = {
  foundations: 'Foundations',
  core: 'Core',
  advanced: 'Going further',
};

export const TRACK_BLURB: Record<Track, string> = {
  foundations: 'For a complete beginner. What a program is, what a value is, and how to read what Python tells you. No experience assumed.',
  core: 'The thirteen topics the unit is built on, each one explained end to end and paired with its questions.',
  advanced: 'Beyond the unit: the tools and ideas that separate code that works from code a professional would write.',
};

/** One side of a side-by-side comparison. */
export interface CodeSide {
  /** Plain words, e.g. "What people write" or "What actually works". */
  label: string;
  code: string;
  /** Marks this side as the one not to copy. */
  bad?: boolean;
}

/**
 * A runnable block's output is generated, so `code` must run without needing input unless `stdin` is
 * given. A block that raises on purpose is fine and often the point; say so in the surrounding prose.
 */
export type LessonBlock =
  /** Explanation. The workhorse: most of a lesson is prose. */
  | { kind: 'prose'; body: Md }
  /** A program, with the output the verifier recorded underneath. */
  | { kind: 'code'; code: string; caption?: Md; stdin?: string[]; hideOutput?: boolean }
  /** A Python shell session. Each line is evaluated in one shared namespace; results are generated. */
  | { kind: 'shell'; lines: string[]; caption?: Md; stdin?: string[] }
  /** Two versions side by side. Both are run, so the difference shown is the real one. */
  | { kind: 'compare'; left: CodeSide; right: CodeSide; caption?: Md }
  /** A short aside. `exam` is for "this comes up in the paper". */
  | { kind: 'callout'; tone: 'note' | 'warn' | 'exam'; title?: string; body: Md }
  /** Check yourself: a question with the answer hidden until asked for. */
  | { kind: 'checkpoint'; prompt: Md; answer: Md }
  /**
   * A question answered in place, with a reason for every option, right or wrong. Prefer this to a
   * paragraph explaining a distinction: a reader who has to choose finds out whether they actually knew.
   */
  | {
      kind: 'quiz'; prompt: Md; code?: string;
      /** 2 to 5 options, at least one correct. `why` is revealed when that option is chosen. */
      options: { text: string; correct?: boolean; why: Md }[];
    }
  /**
   * Commit to an answer before seeing it. The reader says what the code prints, then the real output is
   * revealed. This is the strongest device in the library: reading code you have already bet on is a
   * different act from reading code with the answer underneath.
   */
  | {
      kind: 'predict'; code: string; stdin?: string[]; ask?: Md;
      /** When set, the reader picks instead of typing. Exactly one must match the real output. */
      choices?: string[];
    }
  /** Drag lines into the order that makes the program work. Indentation is given; only order is asked. */
  | { kind: 'order'; lines: { text: string; indent: number }[]; ask?: Md }
  /** Drag each answer onto the thing it belongs to. Replaces a table the reader would otherwise skim. */
  | { kind: 'match'; pairs: { left: string; right: string }[]; ask?: Md }
  /** Click a line to find out what it does. Replaces prose walking through a program line by line. */
  | { kind: 'annotate'; code: string; notes: Record<string, Md>; ask?: Md }
  /** A numbered list of steps, for procedures ("how to read a traceback"). */
  | { kind: 'steps'; title?: string; items: Md[] }
  /** A small reference table. Rows are plain strings; the first row is the header. */
  | { kind: 'table'; caption?: Md; head: string[]; rows: string[][] }
  /** Pulls in one "what if" experiment from the lesson's topic, controls and all. */
  | { kind: 'experiment'; id: string }
  /**
   * An interactive card written for this lesson: controls the reader moves, and output, a table or a
   * picture that redraws as they move. Same machinery as a topic's experiments, so every combination is
   * run at verify time and a slider redraws with no lag. Available in every track, unlike `experiment`.
   */
  | { kind: 'interactive'; experiment: Experiment }
  /** Pulls in the topic's worked example. */
  | { kind: 'workedExample' }
  /** Pulls in the topic's common mistakes, or just the ones named. */
  | { kind: 'mistakes'; only?: MistakeId[] }
  /** Sends the student to the questions for this lesson's topic. */
  | { kind: 'practice'; body?: Md };

export interface LessonSection {
  /** Unique within the lesson, kebab-case. Becomes the step in the rail and the anchor in the URL. */
  id: string;
  /** Short enough for the step rail, e.g. "Why it matters". */
  title: string;
  blocks: LessonBlock[];
}

export interface Lesson {
  /** Globally unique, kebab-case, e.g. "reading-an-error" or "core-dictionaries". */
  id: string;
  title: string;
  /** One sentence for the library card. No full stop needed. */
  summary: string;
  track: Track;
  /** Honest reading time in minutes, counting the interactive parts. */
  minutes: number;
  /** The topic this lesson teaches, when it has one. Enables experiment/mistakes/practice blocks. */
  topicId?: TopicId;
  /** Lesson ids a reader should have done first. Shown as "Before this". */
  prereqs?: string[];
  /**
   * Where this sits in its track's reading order, lowest first. Required for foundations and advanced,
   * where there is no other source of truth; core lessons are ordered by their topic instead, so they
   * do not need it. A library sorted by filename teaches nothing: "Doing arithmetic" must not come
   * before "What a program is".
   */
  order?: number;
  /** Two to five plain-words outcomes: "By the end you can ...". */
  outcomes: string[];
  sections: LessonSection[];
}

// ---------- generated data (written by the verifier, never hand-edited) ----------

export interface LessonError { type: string; message: string; line: number }

/** One recorded line of a shell session. */
export interface ShellLine {
  /** The source that was typed. */
  source: string;
  /** Anything printed while it ran. */
  stdout: string;
  /** The repr of the value, when the line was an expression that produced one. */
  value?: string;
  error?: LessonError;
}

export interface GeneratedBlock {
  stdout?: string;
  error?: LessonError;
  /** compare blocks record both sides. */
  left?: { stdout: string; error?: LessonError };
  right?: { stdout: string; error?: LessonError };
  /** shell blocks record one entry per line. */
  shell?: ShellLine[];
  /** interactive blocks record every combination of their controls. */
  experiment?: GeneratedExperiment;
}

/** Block key ("s2-b1": section index, block index) -> what running it really did. */
export type GeneratedLesson = Record<string, GeneratedBlock>;

/** Stable key for a runnable block, so generated output matches the block it belongs to. */
export function blockKey(sectionIndex: number, blockIndex: number): string {
  return `s${sectionIndex}-b${blockIndex}`;
}
