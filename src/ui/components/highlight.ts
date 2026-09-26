// Tiny highlighter for static code (cheat sheets, questions, reports, lessons). Monaco is only used in
// editors. Python by default; R for the STAT2402 lessons.
import type { Lang } from '../../content/lessonSchema.ts';

const KEYWORDS = new Set(['False','None','True','and','as','assert','async','await','break','class','continue','def','del','elif','else','except','finally','for','from','global','if','import','in','is','lambda','nonlocal','not','or','pass','raise','return','try','while','with','yield','match','case']);
const BUILTINS = new Set(['print','input','len','range','int','float','str','bool','list','dict','tuple','set','sum','min','max','abs','round','sorted','reversed','enumerate','zip','open','type','isinstance','ord','chr','map','filter','any','all','repr','iter','next','divmod','pow']);

const R_KEYWORDS = new Set(['if','else','repeat','while','function','for','in','next','break','TRUE','FALSE','NULL','Inf','NaN','NA','NA_integer_','NA_real_','NA_character_','return']);
// The functions a STAT2402 program leans on, coloured as built-ins so the model-fitting calls stand out.
const R_BUILTINS = new Set(['c','list','data.frame','print','cat','paste','paste0','length','sum','mean','var','sd','min','max','exp','log','sqrt','round','seq','rep','head','tail','summary','str','nrow','ncol','table','tapply','sapply','lapply','with','subset','factor','levels','relevel','lm','glm','anova','predict','coef','confint','resid','residuals','fitted','deviance','df.residual','binomial','poisson','quasipoisson','quasibinomial','Gamma','gaussian','dpois','ppois','rpois','dbinom','pbinom','rbinom','plogis','qlogis','pchisq','rnbinom','rnorm','set.seed','offset','unname','names','cbind','rbind','abs']);

export type Token = { t: 'k' | 's' | 'n' | 'c' | 'f' | 'b' | 'p'; v: string };

const RE = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|[rbfRBF]{0,2}"(?:\\.|[^"\\\n])*"|[rbfRBF]{0,2}'(?:\\.|[^'\\\n])*')|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+|.)/g;

// R names may contain dots (data.frame, df.residual) and start with one; strings have no prefixes; a
// number may end in L for an integer; backticks quote a name such as `(Intercept)`.
const R_RE = /(#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`\n]*`)|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?L?\b|\.\d+\b)|([A-Za-z.][A-Za-z0-9._]*)|(\s+|.)/g;

export function tokenize(code: string, lang: Lang = 'python'): Token[] {
  const r = lang === 'r';
  const re = r ? R_RE : RE;
  const keywords = r ? R_KEYWORDS : KEYWORDS;
  const builtins = r ? R_BUILTINS : BUILTINS;
  const out: Token[] = [];
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(code))) {
    if (m[1]) out.push({ t: 'c', v: m[1] });
    else if (m[2]) out.push({ t: 's', v: m[2] });
    else if (m[3]) out.push({ t: 'n', v: m[3] });
    else if (m[4]) {
      const w = m[4];
      const rest = code.slice(re.lastIndex);
      const prev = out.length ? out[out.length - 1] : undefined;
      const prevWord = out.slice().reverse().find((x) => x.v.trim())?.v;
      if (keywords.has(w)) out.push({ t: 'k', v: w });
      else if (!r && prevWord === 'def') out.push({ t: 'f', v: w });
      else if (builtins.has(w) && /^\s*\(/.test(rest)) out.push({ t: 'b', v: w });
      // `fit$coefficients`: the part after $ is a name inside the object, never a call.
      else if (/^\(/.test(rest) && prev?.v !== '.' && prev?.v !== '$') out.push({ t: 'f', v: w });
      else out.push({ t: 'p', v: w });
    } else out.push({ t: 'p', v: m[5] ?? m[0] });
  }
  return out;
}
