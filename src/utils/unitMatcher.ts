/* Match pasted ITI / JD office names or codes to the unit directory.
   Accepts a column pasted from Excel, a comma list of codes, or free typing, e.g.
     ITI-UP-209 / 209 / 009 / [209] / Government ITI, Nandgaon, Mathura [209] / Nandgaon
   Results are split into: matched (exactly one unit), ambiguous (several units fit),
   notFound (with "did you mean" suggestions). Nothing is added automatically unless
   it is an unambiguous match.                                                           */
import { FieldUnit } from '../types/portal';

export interface MatchedEntry { token: string; unit: FieldUnit; how: 'code' | 'number' | 'name' }
export interface AmbiguousEntry { token: string; candidates: FieldUnit[] }
export interface NotFoundEntry { token: string; suggestions: FieldUnit[] }
export interface MatchResult {
  matched: MatchedEntry[];
  ambiguous: AmbiguousEntry[];
  notFound: NotFoundEntry[];
  /** pasted lines that pointed at an already-listed unit again */
  duplicates: number;
}

const NOISE = new Set([
  'government', 'govt', 'gov', 'iti', 'i.t.i', 'राजकीय', 'औद्योगिक', 'प्रशिक्षण', 'संस्थान', 'आईटीआई', 'iti.',
  'of', 'the', 'ke', 'ka', 'ki'
]);

const clean = (s: string) =>
  s
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();

const words = (s: string) => clean(s).split(/\s+/).filter(w => w && !NOISE.has(w));

const unitWords = (u: FieldUnit) => new Set(words(u.name).concat(words(u.district)));
const unitNameWords = (u: FieldUnit) => new Set(words(u.name));

/** "ITI-UP-209", "iti up 209" -> "iti-up-209" ; "JD UP AGR" -> "jd-up-agr" */
const normCode = (s: string) => s.toLowerCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-').trim();

const codeNumber = (code: string): number | null => {
  const m = /(\d+)\s*$/.exec(code);
  return m ? parseInt(m[1], 10) : null;
};

const stripBullets = (s: string) =>
  s
    .replace(/^[\s"'“”‘’•*\-–—]+|[\s"'“”‘’]+$/g, '')
    .replace(/^\(?\d{1,3}[.)]\s+/, '') // "1. " / "12) " serial numbers before a name
    .trim();

const looksLikeCode = (t: string) => /^((iti|jd)[\s_-]*up[\s_-]*[a-z0-9]+|\d{1,4}|\[\d{1,4}\])$/i.test(t.trim());

export function splitPasted(text: string): string[] {
  const out: string[] = [];
  text.split(/\r?\n|\t/).forEach(line => {
    const l = line.trim();
    if (!l) return;
    const parts = l.split(/[,;|]/).map(p => p.trim()).filter(Boolean);
    // a comma list of codes/numbers -> split it; otherwise the commas belong to a name
    if (parts.length > 1 && parts.every(looksLikeCode)) out.push(...parts);
    else out.push(l);
  });
  return out.map(stripBullets).filter(Boolean);
}

const bigrams = (s: string) => {
  const t = s.replace(/\s+/g, ' ');
  const set: string[] = [];
  for (let i = 0; i < t.length - 1; i++) set.push(t.slice(i, i + 2));
  return set;
};
const dice = (a: string, b: string) => {
  const A = bigrams(a), B = bigrams(b);
  if (!A.length || !B.length) return 0;
  const used = new Array(B.length).fill(false);
  let hit = 0;
  A.forEach(x => {
    const j = B.findIndex((y, k) => !used[k] && y === x);
    if (j >= 0) { used[j] = true; hit++; }
  });
  return (2 * hit) / (A.length + B.length);
};

export function matchUnitsFromText(text: string, units: FieldUnit[]): MatchResult {
  const byCode = new Map(units.map(u => [normCode(u.code), u]));
  const itiByNumber = new Map<number, FieldUnit[]>();
  units.forEach(u => {
    if (u.type !== 'ITI') return;
    const n = codeNumber(u.code);
    if (n !== null) itiByNumber.set(n, [...(itiByNumber.get(n) || []), u]);
  });
  const prepared = units.map(u => ({ u, w: unitWords(u), nw: unitNameWords(u), key: words(u.name).join(' ') }));

  const matched: MatchedEntry[] = [];
  const ambiguous: AmbiguousEntry[] = [];
  const notFound: NotFoundEntry[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  const take = (token: string, unit: FieldUnit, how: MatchedEntry['how']) => {
    if (seen.has(unit.id)) { duplicates++; return; }
    seen.add(unit.id);
    matched.push({ token, unit, how });
  };

  splitPasted(text).forEach(token => {
    // 1) exact code
    const direct = byCode.get(normCode(token));
    if (direct) return take(token, direct, 'code');

    // 2) number only ("209", "009", "[209]") or a number inside brackets in a longer name
    const num = /^\[?\s*(\d{1,4})\s*\]?$/.exec(token) || /\[\s*(\d{1,4})\s*\]\s*$/.exec(token);
    if (num) {
      const hit = itiByNumber.get(parseInt(num[1], 10));
      if (hit && hit.length === 1) return take(token, hit[0], /^\[?\s*\d/.test(token) && /^\[?\s*\d{1,4}\s*\]?$/.test(token) ? 'number' : 'code');
      if (hit && hit.length > 1) return void ambiguous.push({ token, candidates: hit });
    }

    // 3) by name words
    const tw = words(token);
    if (tw.length === 0) return void notFound.push({ token, suggestions: [] });
    const tkey = tw.join(' ');
    const exact = prepared.filter(p => p.key === tkey);
    if (exact.length === 1) return take(token, exact[0].u, 'name');

    const allIn = prepared.filter(p => tw.every(w => p.w.has(w)));
    // prefer units whose NAME (not just district) holds every word
    const inName = allIn.filter(p => tw.every(w => p.nw.has(w)));
    const pool = inName.length ? inName : allIn;
    if (pool.length === 1) return take(token, pool[0].u, 'name');
    if (pool.length > 1) return void ambiguous.push({ token, candidates: pool.map(p => p.u) });

    // 4) nothing fits -> closest names (typo-tolerant, word by word)
    const suggestions = prepared
      .map(p => {
        const uw = Array.from(p.nw);
        if (!uw.length) return { u: p.u, s: 0 };
        const score = tw.reduce((sum, w) => sum + Math.max(...uw.map(x => dice(w, x))), 0) / tw.length;
        return { u: p.u, s: score };
      })
      .filter(x => x.s >= 0.6)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map(x => x.u);
    notFound.push({ token, suggestions });
  });

  return { matched, ambiguous, notFound, duplicates };
}
