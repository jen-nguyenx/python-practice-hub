// Tiny Python highlighter for static code (cheat sheets, questions, reports). Monaco is only used in editors.
const KEYWORDS = new Set(['False','None','True','and','as','assert','async','await','break','class','continue','def','del','elif','else','except','finally','for','from','global','if','import','in','is','lambda','nonlocal','not','or','pass','raise','return','try','while','with','yield','match','case']);
const BUILTINS = new Set(['print','input','len','range','int','float','str','bool','list','dict','tuple','set','sum','min','max','abs','round','sorted','reversed','enumerate','zip','open','type','isinstance','ord','chr','map','filter','any','all','repr','iter','next','divmod','pow']);

export type Token = { t: 'k' | 's' | 'n' | 'c' | 'f' | 'b' | 'p'; v: string };

const RE = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|[rbfRBF]{0,2}"(?:\\.|[^"\\\n])*"|[rbfRBF]{0,2}'(?:\\.|[^'\\\n])*')|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+|.)/g;

export function tokenize(code: string): Token[] {
  const out: Token[] = [];
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(code))) {
    if (m[1]) out.push({ t: 'c', v: m[1] });
    else if (m[2]) out.push({ t: 's', v: m[2] });
    else if (m[3]) out.push({ t: 'n', v: m[3] });
    else if (m[4]) {
      const w = m[4];
      const rest = code.slice(RE.lastIndex);
      const prev = out.length ? out[out.length - 1] : undefined;
      const prevWord = out.slice().reverse().find((x) => x.v.trim())?.v;
      if (KEYWORDS.has(w)) out.push({ t: 'k', v: w });
      else if (prevWord === 'def') out.push({ t: 'f', v: w });
      else if (BUILTINS.has(w) && /^\s*\(/.test(rest)) out.push({ t: 'b', v: w });
      else if (/^\(/.test(rest) && prev?.v !== '.') out.push({ t: 'f', v: w });
      else out.push({ t: 'p', v: w });
    } else out.push({ t: 'p', v: m[5] ?? m[0] });
  }
  return out;
}
