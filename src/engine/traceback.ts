// Pull the useful parts out of a Python traceback that someone has pasted in.
//
// Beginners paste whatever they have: the whole traceback, just the last line, sometimes just the type.
// All three should work, because a tool that only accepts one shape is a tool that gets abandoned.

export interface ParsedError {
  type: string;
  message: string;
  /** The last line number the traceback blamed, when it gave one. */
  line?: number;
  /** The file that line was in, when it was not the student's own program. */
  file?: string;
}

/** A Python exception name: capitalised, letters only, and conventionally ending in Error or similar. */
const NAME = /^[A-Z][A-Za-z]*(Error|Exception|Warning|Exit|Interrupt|Iteration)$/;
const LINE_RE = /File "([^"]*)", line (\d+)/g;

/**
 * The exception is on the last non-indented line that names one. Everything above it is the call chain,
 * which is why reading a traceback bottom-up is the advice: the bottom line is the what, the rest is how
 * Python got there.
 */
export function parseTraceback(text: string): ParsedError | null {
  const raw = (text ?? '').replace(/\r\n?/g, '\n').trim();
  if (!raw) return null;

  let line: number | undefined;
  let file: string | undefined;
  LINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINE_RE.exec(raw))) {
    line = Number(m[2]);
    file = m[1];
  }

  const lines = raw.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const candidate = lines[i].trim();
    if (!candidate) continue;
    // "TypeError: can only concatenate str" or a bare "KeyboardInterrupt".
    const withMessage = /^([A-Za-z_][A-Za-z0-9_.]*)\s*:\s*([\s\S]*)$/.exec(candidate);
    if (withMessage) {
      const type = withMessage[1].split('.').pop() ?? withMessage[1];
      if (NAME.test(type)) {
        return { type, message: withMessage[2].trim(), ...(line ? { line } : {}), ...(file ? { file } : {}) };
      }
      continue;
    }
    if (NAME.test(candidate)) {
      return { type: candidate, message: '', ...(line ? { line } : {}), ...(file ? { file } : {}) };
    }
  }
  return null;
}

/** True when the traceback's last frame is the student's own file rather than a library. */
export function inOwnCode(file: string | undefined): boolean {
  if (!file) return true;
  return !/[/\\](site-packages|lib|python3?\.\d+)[/\\]/i.test(file);
}
