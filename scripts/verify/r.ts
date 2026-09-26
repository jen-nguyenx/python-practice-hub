// The verifier's R: webR in Node, driven through its console by the same driver the browser uses.
//
// One R session for the whole verify run; every program starts from a cleared workspace (harness.R
// `.pl_reset`), so blocks cannot leak into each other.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WebR } from 'webr';
import { RDriver } from '../../src/runtime/r/driver.ts';
import type { RConsole, RMessage } from '../../src/runtime/r/driver.ts';
import type { RPackage } from '../../src/runtime/r/packages.ts';
import { PROJECT_ROOT } from './pyodide.ts';
import { R_PACKAGE_DIR, sha256 } from '../r-packages.ts';

/** A pinned package from public/r-packages, refused if it is not byte for byte what was pinned. */
function loadPinned(p: RPackage): Promise<Uint8Array> {
  const bytes = new Uint8Array(readFileSync(join(R_PACKAGE_DIR, p.file)));
  if (sha256(bytes) !== p.sha256) throw new Error(`${p.file} does not match its pinned hash; run node scripts/r-packages.ts`);
  return Promise.resolve(bytes);
}

export const R_HARNESS_PATH = join(PROJECT_ROOT, 'src', 'runtime', 'r', 'harness.R');

/** A program still running after this long is interrupted and reported as never finishing. */
const RUN_LIMIT_MS = 20_000;

export interface RSession { driver: RDriver; close(): void }

export async function createRSession(): Promise<RSession> {
  const webR = new WebR();
  await webR.init();
  let timedOut = false;
  const con: RConsole = {
    write: (text) => webR.writeConsole(text),
    async readUntilPrompt() {
      const out: RMessage[] = [];
      const timer = setTimeout(() => { timedOut = true; webR.interrupt(); }, RUN_LIMIT_MS);
      try {
        for (;;) {
          const m = await webR.read();
          const msg: RMessage = { type: m.type, data: typeof m.data === 'string' ? m.data : '' };
          out.push(msg);
          if (m.type === 'prompt' || m.type === 'closed') break;
        }
      } finally {
        clearTimeout(timer);
      }
      if (timedOut) {
        timedOut = false;
        throw new Error(`R was still running after ${RUN_LIMIT_MS / 1000} s and was interrupted; the code never finishes`);
      }
      return out;
    },
    evalString: (code) => webR.evalRString(code),
    writeFile: async (path, bytes) => { await webR.FS.writeFile(path, bytes); },
  };
  const driver = new RDriver(con, readFileSync(R_HARNESS_PATH, 'utf8'), { loadPackage: loadPinned });
  await driver.start();
  return { driver, close: () => webR.close() };
}
