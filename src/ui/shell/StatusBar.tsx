// 28px status bar (docs/build/DESIGN.md "Frame"): runtime on the left; an optional screen note (e.g. "Ln 4, Col 26")
// and "Week N · exams in N days" from the CITS1401 calendar on the right. Mono 12px.
import { useEffect, useState } from 'preact/hooks';
import { RuntimePill } from './RuntimePill.tsx';
import { semesterInfo } from './semester.ts';
import { statusBarExtra } from './uiState.ts';

/** Semester info, refreshed every 10 minutes so a tab left open overnight moves to the next day. */
export function useSemester() {
  const [info, setInfo] = useState(() => semesterInfo());
  useEffect(() => {
    const t = setInterval(() => setInfo(semesterInfo()), 600_000);
    return () => clearInterval(t);
  }, []);
  return info;
}

export function StatusBar() {
  const sem = useSemester();
  const extra = statusBarExtra.value;
  return (
    <footer class="statusbar">
      <RuntimePill compact />
      <span class="spacer" />
      {extra ? <span class="sb-item num">{extra}</span> : null}
      <span class="sb-item num" title={sem.detail}>{sem.label}</span>
    </footer>
  );
}
